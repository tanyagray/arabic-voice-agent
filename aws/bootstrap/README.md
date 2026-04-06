# Bootstrap Infrastructure

One-time setup for AWS deployments (preview + production). Creates shared resources that all environments depend on.

## What it creates

| Resource | Name | Purpose |
|----------|------|---------|
| VPC + Subnet | `arabic-voice-agent` | Shared networking for EC2 instances |
| EC2 Instance Profile | `mishmish-ec2-instance` | IAM role for prod/preview EC2 (ECR pull, Secrets Manager, CloudWatch) |
| ECR Repository | `arabic-voice-agent-api` | Docker images for API services |
| ECR Repository | `arabic-voice-agent-claude-agent` | Docker images for Claude Agent service |
| IAM Role | `github-actions-preview-deploy` | Assumed by GitHub Actions via OIDC |
| IAM Role | `apprunner-ecr-access` | Allows App Runner to pull images from ECR (Claude Agent) |

## Prerequisites

- AWS CLI configured with admin credentials
- A GitHub OIDC provider must exist in your account (check IAM > Identity providers)

## Deploy

```bash
aws cloudformation deploy \
  --stack-name arabic-voice-agent-bootstrap \
  --template-file aws/bootstrap/template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-west-2 \
  --tags Project=arabic-voice-agent \
  --parameter-overrides \
    GitHubOrg=tanyagray \
    GitHubRepo=arabic-voice-agent \
    GitHubOidcProviderArn=<your-oidc-provider-arn>
```

If the OIDC provider already exists (e.g. from another project), pass its ARN via the `GitHubOidcProviderArn` parameter.

## After deployment

Get the stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name arabic-voice-agent-bootstrap \
  --region us-west-2 \
  --query "Stacks[0].Outputs" \
  --output table
```

Set these as GitHub repository secrets:

| GitHub Secret | Stack Output |
|---------------|-------------|
| `AWS_ROLE_ARN` | `GitHubActionsRoleArn` |
| `AWS_REGION` | `us-west-2` (hardcoded) |
| `AWS_ECR_REGISTRY` | `EcrRepositoryUri` (just the registry part: `{account}.dkr.ecr.us-west-2.amazonaws.com`) |
| `AWS_APP_RUNNER_ECR_ROLE_ARN` | `AppRunnerEcrAccessRoleArn` |

## Teardown

To remove all bootstrap resources:

```bash
aws cloudformation delete-stack \
  --stack-name arabic-voice-agent-bootstrap \
  --region us-west-2
```

Note: The ECR repositories must be empty before deletion. Delete all images first:

```bash
aws ecr batch-delete-image \
  --repository-name arabic-voice-agent-api \
  --image-ids "$(aws ecr list-images --repository-name arabic-voice-agent-api --query 'imageIds[*]' --output json)" \
  --region us-west-2
```
