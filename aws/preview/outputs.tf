output "preview_instance_id" {
  value = module.api_host.instance_id
}

output "preview_elastic_ip" {
  value       = module.api_host.public_ip
  description = "Elastic IP — point *.preview.mishmish.ai A records here."
}

output "preview_static_bucket_name" {
  value = aws_s3_bucket.static.bucket
}

output "preview_static_distribution_id" {
  value = module.static_site.distribution_id
}

output "preview_static_distribution_domain" {
  value = module.static_site.distribution_domain_name
}
