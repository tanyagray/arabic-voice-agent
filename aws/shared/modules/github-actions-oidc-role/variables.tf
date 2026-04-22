variable "role_name" {
  type        = string
  description = "Name of the IAM role."
}

variable "oidc_provider_arn" {
  type        = string
  description = "ARN of the existing GitHub OIDC provider in this account."
}

variable "github_org" {
  type        = string
  description = "GitHub organization or user owning the repo."
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name."
}

variable "allowed_refs" {
  type        = list(string)
  description = "List of sub-claim patterns (repo:ORG/REPO:*) allowed to assume the role."
}

variable "inline_policy_json" {
  type        = string
  description = "Inline policy JSON to attach to the role."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to the role."
}
