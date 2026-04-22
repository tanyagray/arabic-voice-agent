variable "region" {
  type        = string
  default     = "us-west-2"
  description = "AWS region."
}

variable "github_org" {
  type        = string
  default     = "tanyagray"
  description = "GitHub organization or user owning the repo."
}

variable "github_repo" {
  type        = string
  default     = "arabic-voice-agent"
  description = "GitHub repository name."
}

variable "state_bucket_name" {
  type        = string
  default     = "mishmish-tf-state"
  description = "Terraform state bucket (referenced in the CI deploy policy)."
}

variable "tags" {
  type = map(string)
  default = {
    Project = "arabic-voice-agent"
  }
  description = "Tags applied to all resources."
}
