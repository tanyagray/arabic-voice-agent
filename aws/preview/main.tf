provider "aws" {
  region = var.region
  default_tags {
    tags = var.tags
  }
}

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = var.state_bucket_name
    key    = "shared/terraform.tfstate"
    region = var.region
  }
}

# ---------------------------------------------------------------------------
# Shared preview API host (EC2) — PR-specific containers added via SSM
# ---------------------------------------------------------------------------

module "api_host" {
  source = "../shared/modules/ec2-docker-host"

  name                  = "api-preview.mishmish.ai"
  vpc_id                = data.terraform_remote_state.shared.outputs.vpc_id
  subnet_id             = data.terraform_remote_state.shared.outputs.public_subnet_id
  instance_profile_name = data.terraform_remote_state.shared.outputs.ec2_instance_profile
  region                = var.region
  caddy_config_mode     = "preview-empty"
  domain_name           = var.preview_domain
  tags                  = var.tags
}

# ---------------------------------------------------------------------------
# Shared preview static-sites S3 bucket + CloudFront
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "static" {
  bucket        = "mishmish-preview"
  force_destroy = true
  tags          = var.tags
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

module "static_site" {
  source = "../shared/modules/cloudfront-site"

  name                        = "mishmish-preview"
  comment                     = "Shared preview static sites (all PRs)"
  bucket_regional_domain_name = aws_s3_bucket.static.bucket_regional_domain_name
  aliases                     = []
  acm_certificate_arn         = ""
  spa_error_routing           = false
  cloudfront_function_code    = file("${path.module}/files/preview-spa-routing.js")
  cloudfront_function_runtime = "cloudfront-js-2.0"
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
            "AWS:SourceArn" = module.static_site.distribution_arn
          }
        }
      },
    ]
  })
}
