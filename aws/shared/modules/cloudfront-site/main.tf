locals {
  use_custom_domain = var.acm_certificate_arn != ""
  use_function      = var.cloudfront_function_code != ""
  # CloudFront managed cache policy: CachingOptimized
  caching_optimized_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
}

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = var.name
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "this" {
  count   = local.use_function ? 1 : 0
  name    = "${var.name}-viewer-request"
  runtime = var.cloudfront_function_runtime
  publish = true
  code    = var.cloudfront_function_code
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  comment             = var.comment
  default_root_object = var.default_root_object
  price_class         = "PriceClass_100"
  aliases             = var.aliases

  origin {
    origin_id                = "S3Origin"
    domain_name              = var.bucket_regional_domain_name
    origin_path              = var.origin_path
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id

    s3_origin_config {
      origin_access_identity = ""
    }
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = local.caching_optimized_policy_id
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    dynamic "function_association" {
      for_each = local.use_function ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.this[0].arn
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = local.use_custom_domain ? false : true
    acm_certificate_arn            = local.use_custom_domain ? var.acm_certificate_arn : null
    ssl_support_method             = local.use_custom_domain ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_domain ? "TLSv1.2_2021" : null
  }

  dynamic "custom_error_response" {
    for_each = var.spa_error_routing ? [403, 404] : []
    content {
      error_code            = custom_error_response.value
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 0
    }
  }

  tags = var.tags
}
