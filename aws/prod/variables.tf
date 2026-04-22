variable "region" {
  type    = string
  default = "us-west-2"
}

variable "state_bucket_name" {
  type        = string
  default     = "mishmish-tf-state"
  description = "Terraform state bucket (used to read shared env outputs)."
}

variable "api_image_uri" {
  type        = string
  description = "Full ECR image URI for the API container (e.g. 123.dkr.ecr.us-west-2.amazonaws.com/arabic-voice-agent-api:v1.2.3)."
}

variable "api_secret_arn" {
  type        = string
  description = "ARN of the Secrets Manager secret mishmish/prod/api."
}

variable "api_domain" {
  type    = string
  default = "api.mishmish.ai"
}

variable "acm_certificate_domain" {
  type        = string
  default     = "mishmish.ai"
  description = "ACM certificate primary domain (looked up in us-east-1; cert includes *.mishmish.ai SAN)."
}

variable "web_app_aliases" {
  type    = list(string)
  default = ["mishmish.ai", "www.mishmish.ai"]
}

variable "admin_aliases" {
  type    = list(string)
  default = ["admin.mishmish.ai"]
}

variable "tags" {
  type = map(string)
  default = {
    Project     = "arabic-voice-agent"
    Environment = "production"
  }
}
