terraform {
  backend "s3" {
    bucket       = "mishmish-tf-state"
    key          = "shared/terraform.tfstate"
    region       = "us-west-2"
    encrypt      = true
    use_lockfile = true
  }
}
