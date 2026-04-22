variable "name" {
  type        = string
  description = "Name used for OAC and as Name tag. Must be unique per distribution in the account."
}

variable "comment" {
  type        = string
  default     = ""
  description = "Distribution comment."
}

variable "bucket_regional_domain_name" {
  type        = string
  description = "Regional domain name of the S3 origin bucket (e.g. mishmish-prod.s3.us-west-2.amazonaws.com)."
}

variable "origin_path" {
  type        = string
  default     = ""
  description = "Optional origin path prefix (e.g. /web-app). Leading slash, no trailing slash."
}

variable "aliases" {
  type        = list(string)
  default     = []
  description = "Custom domain aliases for the distribution."
}

variable "acm_certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN (us-east-1). Empty string means use the default CloudFront certificate."
}

variable "default_root_object" {
  type        = string
  default     = "index.html"
  description = "Default root object for the distribution."
}

variable "spa_error_routing" {
  type        = bool
  default     = true
  description = "Map 403/404 errors to /index.html (SPA routing)."
}

variable "cloudfront_function_code" {
  type        = string
  default     = ""
  description = "JavaScript source for an attached CloudFront Function (viewer-request). Empty disables."
}

variable "cloudfront_function_runtime" {
  type        = string
  default     = "cloudfront-js-2.0"
  description = "Runtime for the CloudFront Function."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to the distribution and OAC."
}
