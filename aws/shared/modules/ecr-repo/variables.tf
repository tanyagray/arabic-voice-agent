variable "name" {
  type        = string
  description = "Repository name."
}

variable "untagged_retention_days" {
  type        = number
  default     = 7
  description = "Expire untagged images after this many days."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to the repository."
}
