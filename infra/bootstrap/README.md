# Bootstrap Infrastructure

One-time setup for AWS preview deployments. Creates shared resources that all preview environments depend on.

## What it creates

| Resource | Name | Purpose |
|----------|------|---------|
| ECR Repository | `arabic-voice-agent-api` | Stores Docker images for preview API services |
| OIDC Provider | `token.actions.githubusercontent.com` | Allows GitHub Actions to authenticate without long-lived AWS keys |
| IAM Role | `github-actions-preview-deploy` | Assumed by GitHub Actions via OIDC to manage preview resources |
| IAM Role | `apprunner-ecr-access` | Allows App Runner to pull images from ECR |

## Prerequisites

- AWS CLI configured with admin credentials
- The GitHub OIDC provider must not already exist in your account (check IAM > Identity providers)

## Deploy

```bash
aws cloudformation deploy \
  --stack-name arabic-voice-agent-bootstrap \
  --template-file infra/bootstrap/template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-west-2 \
  --parameter-overrides \
    GitHubOrg=tanyagray \
    GitHubRepo=arabic-voice-agent
```

If the OIDC provider already exists (e.g. from another project), remove the `GitHubOidcProvider` resource from the template and update the `GitHubActionsRole` trust policy to reference the existing provider ARN.

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

Also ensure these secrets already exist (carried over from the Render setup):

| GitHub Secret | Purpose |
|---------------|---------|
| `SUPABASE_PERSONAL_ACCESS_TOKEN` | Supabase Management API access |
| `OPENAI_API_KEY` | OpenAI GPT-4o for voice pipeline |
| `DEEPGRAM_API_KEY` | Deepgram STT |
| `ELEVEN_API_KEY` | ElevenLabs TTS |

And this variable:

| GitHub Variable | Purpose |
|-----------------|---------|
| `SUPABASE_PROJECT_REF` | Supabase project identifier |

## IAM permissions summary

### `github-actions-preview-deploy` role

This role is assumed by GitHub Actions via OIDC. It can:

- **ECR**: Push, pull, and delete images in the `arabic-voice-agent-api` repository
- **App Runner**: Create, update, and delete preview services
- **S3**: Create and delete buckets prefixed with `preview-*`, upload/delete objects
- **CloudFront**: Create, update, and delete distributions and origin access controls
- **CloudFormation**: Create, update, and delete stacks prefixed with `preview-pr-*`
- **IAM**: Pass the `apprunner-ecr-access` role to App Runner services

The trust policy restricts this role to the `tanyagray/arabic-voice-agent` repository only.

### `apprunner-ecr-access` role

This role is assumed by App Runner's build service. It can only pull images from the `arabic-voice-agent-api` ECR repository.

## Teardown

To remove all bootstrap resources:

```bash
aws cloudformation delete-stack \
  --stack-name arabic-voice-agent-bootstrap \
  --region us-west-2
```

Note: The ECR repository must be empty before deletion. Delete all images first:

```bash
aws ecr batch-delete-image \
  --repository-name arabic-voice-agent-api \
  --image-ids "$(aws ecr list-images --repository-name arabic-voice-agent-api --query 'imageIds[*]' --output json)" \
  --region us-west-2
```
