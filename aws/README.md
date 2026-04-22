# Infra — Terraform

AWS infrastructure for arabic-voice-agent, managed with Terraform.

## Layout

```
aws/
├── shared/          # env: VPC, ECR, IAM role, EC2 instance profile
│   └── modules/     # reusable modules (called by prod + preview)
├── prod/            # env: prod API EC2, static-sites S3 + CloudFront
└── preview/         # env: shared preview EC2, preview static S3 + CloudFront
```

Each env has its own remote state in the `mishmish-tf-state` S3 bucket.

## One-time state backend setup

Before applying any env for the first time, create the state bucket. This is
done once per AWS account with admin credentials.

```bash
aws s3api create-bucket --bucket mishmish-tf-state \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

aws s3api put-bucket-versioning --bucket mishmish-tf-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption --bucket mishmish-tf-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block --bucket mishmish-tf-state \
  --public-access-block-configuration \
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

aws s3api put-bucket-ownership-controls --bucket mishmish-tf-state \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

aws s3api put-bucket-lifecycle-configuration --bucket mishmish-tf-state \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "expire-noncurrent-versions",
        "Status": "Enabled",
        "Filter": {},
        "NoncurrentVersionExpiration": { "NoncurrentDays": 90 },
        "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
      }
    ]
  }'
```

State locking uses Terraform 1.10+ native S3 locking (`use_lockfile = true`).
No DynamoDB table required.

## Prerequisites

- **Terraform ≥ 1.10.0** (for native S3 state locking).
- **AWS CLI** with credentials that can assume the `github-actions-preview-deploy`
  role, or admin credentials for the one-time `shared` apply.
- **GitHub OIDC provider** must already exist in the AWS account at
  `https://token.actions.githubusercontent.com`. Terraform reads it via a data
  source — it is NOT created here.
- **ACM certificate** covering `mishmish.ai` and `*.mishmish.ai` must exist in
  `us-east-1` (CloudFront requirement). Terraform reads it via a data source.
- **Secrets Manager** secrets `mishmish/prod/api` and `mishmish/preview/api`
  must exist with the expected keys (see `prod/main.tf`).

## Applying an env

```bash
cd aws/shared  # or aws/prod, aws/preview
terraform init
terraform plan
terraform apply
```

Order for first-time setup:

1. `shared/` — VPC, ECR, IAM roles, instance profile.
2. `prod/` — depends on `shared/` outputs via `terraform_remote_state`.
3. `preview/` — depends on `shared/` outputs via `terraform_remote_state`.

## Outputs consumed by CI

The `github-actions-preview-deploy` role (created in `shared/`) is what CI
assumes. GitHub repo secrets `AWS_ROLE_ARN` and `AWS_ECR_REGISTRY` must match
the outputs of the `shared` env:

```bash
terraform -chdir=shared output -raw github_actions_role_arn
terraform -chdir=shared output -raw ecr_api_url
```

CI workflows that deploy the API container and static sites read stack outputs
from the `prod`/`preview` envs via `terraform output`.

## Migration from CloudFormation (one-time)

See the migration plan — resources in `aws/bootstrap/`, `aws/prod/template.yaml`,
`aws/preview/template.yaml`, and `aws/claude-agent/` are replaced by this
Terraform layout. The `claude.mishmish.ai` / App Runner service is dropped
entirely as part of the migration.
