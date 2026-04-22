provider "aws" {
  region = var.region
  default_tags {
    tags = var.tags
  }
}

# CloudFront/ACM certs must live in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = var.tags
  }
}

data "aws_caller_identity" "current" {}

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = var.state_bucket_name
    key    = "shared/terraform.tfstate"
    region = var.region
  }
}

data "aws_acm_certificate" "wildcard" {
  provider    = aws.us_east_1
  domain      = var.acm_certificate_domain
  statuses    = ["ISSUED"]
  most_recent = true
}

data "aws_secretsmanager_secret" "api" {
  arn = var.api_secret_arn
}

# ---------------------------------------------------------------------------
# API host — EC2 + Caddy + Docker
# ---------------------------------------------------------------------------

module "api_host" {
  source = "../shared/modules/ec2-docker-host"

  name                  = "api.mishmish.ai"
  vpc_id                = data.terraform_remote_state.shared.outputs.vpc_id
  subnet_id             = data.terraform_remote_state.shared.outputs.public_subnet_id
  instance_profile_name = data.terraform_remote_state.shared.outputs.ec2_instance_profile
  region                = var.region
  caddy_config_mode     = "prod"
  domain_name           = var.api_domain
  container_image_uri   = var.api_image_uri
  secret_arn            = data.aws_secretsmanager_secret.api.arn
  tags                  = var.tags
}

# ---------------------------------------------------------------------------
# Shared S3 bucket for web-app and admin-app (under /web-app and /admin-app)
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "static" {
  bucket = "mishmish-prod"
  tags   = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_ownership_controls" "static" {
  bucket = aws_s3_bucket.static.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "static" {
  bucket                  = aws_s3_bucket.static.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static" {
  bucket = aws_s3_bucket.static.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ---------------------------------------------------------------------------
# CloudFront distributions (web-app, admin-app)
# ---------------------------------------------------------------------------

module "web_app" {
  source = "../shared/modules/cloudfront-site"

  name                        = "mishmish-web-app"
  comment                     = "Production - web-app"
  bucket_regional_domain_name = aws_s3_bucket.static.bucket_regional_domain_name
  origin_path                 = "/web-app"
  aliases                     = var.web_app_aliases
  acm_certificate_arn         = data.aws_acm_certificate.wildcard.arn
  spa_error_routing           = true
  tags                        = var.tags
}

module "admin_app" {
  source = "../shared/modules/cloudfront-site"

  name                        = "mishmish-admin-app"
  comment                     = "Production - admin"
  bucket_regional_domain_name = aws_s3_bucket.static.bucket_regional_domain_name
  origin_path                 = "/admin-app"
  aliases                     = var.admin_aliases
  acm_certificate_arn         = data.aws_acm_certificate.wildcard.arn
  spa_error_routing           = true
  tags                        = var.tags
}

resource "aws_s3_bucket_policy" "static" {
  bucket = aws_s3_bucket.static.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.static.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = [
              module.web_app.distribution_arn,
              module.admin_app.distribution_arn,
            ]
          }
        }
      },
    ]
  })
}
