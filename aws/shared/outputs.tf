output "github_actions_role_arn" {
  value       = module.github_actions_role.role_arn
  description = "IAM role ARN for GitHub Actions (set as GitHub secret AWS_ROLE_ARN)."
}

output "ecr_api_url" {
  value       = module.ecr_api.repository_url
  description = "ECR repository URI for the web-api (set as GitHub secret AWS_ECR_REGISTRY)."
}

output "ecr_api_arn" {
  value = module.ecr_api.repository_arn
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_id" {
  value = module.vpc.public_subnet_id
}

output "ec2_instance_profile" {
  value = aws_iam_instance_profile.ec2_instance.name
}

output "ec2_instance_role_arn" {
  value = aws_iam_role.ec2_instance.arn
}
