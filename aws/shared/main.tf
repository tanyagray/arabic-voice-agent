provider "aws" {
  region = var.region
  default_tags {
    tags = var.tags
  }
}

data "aws_caller_identity" "current" {}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# ---------------------------------------------------------------------------
# VPC + ECR
# ---------------------------------------------------------------------------

module "vpc" {
  source = "./modules/vpc"
  name   = "arabic-voice-agent"
  tags   = var.tags
}

module "ecr_api" {
  source = "./modules/ecr-repo"
  name   = "arabic-voice-agent-api"
  tags   = var.tags
}

# ---------------------------------------------------------------------------
# EC2 instance role (shared by prod + preview API hosts)
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2_instance" {
  name               = "mishmish-ec2-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "ec2_secrets_read" {
  name = "SecretsManagerRead"
  role = aws_iam_role.ec2_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_role_policy" "ec2_ecr_pull" {
  name = "EcrPull"
  role = aws_iam_role.ec2_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
        Resource = [module.ecr_api.repository_arn]
      },
    ]
  })
}

resource "aws_iam_role_policy" "ec2_cloudwatch_logs" {
  name = "CloudWatchLogs"
  role = aws_iam_role.ec2_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_instance" {
  name = "mishmish-ec2-instance"
  role = aws_iam_role.ec2_instance.name
  tags = var.tags
}

# ---------------------------------------------------------------------------
# GitHub Actions OIDC role
# ---------------------------------------------------------------------------

locals {
  deploy_policy_json = templatefile("${path.module}/policies/github-actions-deploy.json.tftpl", {
    account_id        = data.aws_caller_identity.current.account_id
    region            = var.region
    state_bucket_name = var.state_bucket_name
    ec2_role_arn      = aws_iam_role.ec2_instance.arn
  })
}

module "github_actions_role" {
  source             = "./modules/github-actions-oidc-role"
  role_name          = "github-actions-preview-deploy"
  oidc_provider_arn  = data.aws_iam_openid_connect_provider.github.arn
  github_org         = var.github_org
  github_repo        = var.github_repo
  allowed_refs       = ["repo:${var.github_org}/${var.github_repo}:*"]
  inline_policy_json = local.deploy_policy_json
  tags               = var.tags
}
