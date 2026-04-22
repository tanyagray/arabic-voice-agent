variable "name" {
  type        = string
  description = "Name tag for instance, security group, and EIP."
}

variable "vpc_id" {
  type        = string
  description = "VPC ID for the security group."
}

variable "subnet_id" {
  type        = string
  description = "Subnet ID for the instance."
}

variable "instance_profile_name" {
  type        = string
  description = "EC2 instance profile name (from shared env)."
}

variable "instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance type."
}

variable "volume_size_gb" {
  type        = number
  default     = 20
  description = "Root EBS volume size in GiB."
}

variable "caddy_config_mode" {
  type        = string
  description = "Either 'prod' (Caddy reverse-proxies to local container) or 'preview-empty' (empty Caddyfile; per-PR blocks appended via SSM)."
  validation {
    condition     = contains(["prod", "preview-empty"], var.caddy_config_mode)
    error_message = "caddy_config_mode must be 'prod' or 'preview-empty'."
  }
}

variable "domain_name" {
  type        = string
  default     = ""
  description = "Domain Caddy should serve (prod mode). Unused in preview-empty mode."
}

variable "container_image_uri" {
  type        = string
  default     = ""
  description = "Full ECR image URI to pull and run on first boot (prod mode only)."
}

variable "secret_arn" {
  type        = string
  default     = ""
  description = "Secrets Manager secret ARN containing API env vars (prod mode only)."
}

variable "region" {
  type        = string
  description = "AWS region (used inside UserData for CLI calls)."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to instance, SG, and EIP."
}
