output "api_instance_id" {
  value       = module.api_host.instance_id
  description = "EC2 instance ID for the prod API (used by SSM deploy)."
}

output "api_elastic_ip" {
  value       = module.api_host.public_ip
  description = "Elastic IP — point api.mishmish.ai A record here."
}

output "api_url" {
  value = "https://${var.api_domain}"
}

output "static_bucket_name" {
  value = aws_s3_bucket.static.bucket
}

output "web_app_distribution_id" {
  value = module.web_app.distribution_id
}

output "web_app_cloudfront_domain" {
  value       = module.web_app.distribution_domain_name
  description = "Point mishmish.ai and www.mishmish.ai to this domain."
}

output "admin_distribution_id" {
  value = module.admin_app.distribution_id
}

output "admin_cloudfront_domain" {
  value       = module.admin_app.distribution_domain_name
  description = "Point admin.mishmish.ai to this domain."
}
