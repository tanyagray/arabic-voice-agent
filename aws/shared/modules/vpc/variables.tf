variable "name" {
  type        = string
  description = "Name tag prefix for all VPC resources."
}

variable "cidr_block" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for the VPC."
}

variable "public_subnet_cidr" {
  type        = string
  default     = "10.0.1.0/24"
  description = "CIDR block for the single public subnet."
}

variable "availability_zone" {
  type        = string
  default     = null
  description = "AZ for the public subnet. Defaults to the first AZ in the region."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to all resources."
}
