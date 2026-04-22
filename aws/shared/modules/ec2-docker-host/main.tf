data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  user_data = templatefile("${path.module}/templates/userdata.sh.tftpl", {
    caddy_mode  = var.caddy_config_mode
    domain_name = var.domain_name
    image_uri   = var.container_image_uri
    secret_arn  = var.secret_arn
    region      = var.region
  })
}

resource "aws_security_group" "this" {
  name        = var.name
  description = "Allow HTTP/HTTPS inbound to ${var.name}"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = var.name })
}

resource "aws_eip" "this" {
  domain = "vpc"
  tags   = merge(var.tags, { Name = var.name })
}

resource "aws_instance" "this" {
  ami                         = data.aws_ssm_parameter.al2023_ami.value
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.this.id]
  iam_instance_profile        = var.instance_profile_name
  user_data                   = local.user_data
  user_data_replace_on_change = false

  root_block_device {
    volume_size = var.volume_size_gb
    volume_type = "gp3"
  }

  tags = merge(var.tags, { Name = var.name })
}

resource "aws_eip_association" "this" {
  allocation_id = aws_eip.this.allocation_id
  instance_id   = aws_instance.this.id
}
