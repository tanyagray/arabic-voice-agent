variable "region" {
  type    = string
  default = "us-west-2"
}

variable "state_bucket_name" {
  type    = string
  default = "mishmish-tf-state"
}

variable "preview_domain" {
  type    = string
  default = "api-preview.mishmish.ai"
}

variable "tags" {
  type = map(string)
  default = {
    Project     = "arabic-voice-agent"
    Environment = "preview"
  }
}
