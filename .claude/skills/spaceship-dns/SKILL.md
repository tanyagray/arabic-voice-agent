---
name: spaceship-dns
description: Manage DNS records for mishmish.ai on Spaceship.com using browser automation. Use this skill whenever the user mentions DNS, domain records, Spaceship, syncing DNS with AWS, or updating CNAME/ALIAS/A records for mishmish.ai or any of its subdomains. Also trigger when the user deploys infrastructure and needs to update DNS to match new CloudFront or App Runner URLs.
---

# Spaceship DNS Manager for mishmish.ai

This skill uses Claude in Chrome browser automation to manage DNS records on Spaceship.com for the domain `mishmish.ai` and its subdomains, keeping them in sync with AWS infrastructure.

## Domain Architecture

The project uses these subdomains, each pointing to a different AWS service:

| Subdomain | Record Type | AWS Target |
|-----------|-------------|------------|
| `mishmish.ai` | ALIAS/ANAME (or A record with flattening) | CloudFront distribution (web-app) |
| `www.mishmish.ai` | CNAME | CloudFront distribution (web-app) |
| `admin.mishmish.ai` | CNAME | CloudFront distribution (admin-app) |
| `api.mishmish.ai` | CNAME | App Runner service URL |
| `claude.mishmish.ai` | CNAME | App Runner service URL |

## Getting Current AWS Target Values

Before updating DNS, fetch the current AWS targets so records point to the right place. Use the AWS MCP tool (`mcp__AWS_API_MCP_Server__call_aws`) or bash:

### CloudFront domains (for mishmish.ai, www, admin)
```bash
aws cloudformation describe-stacks --stack-name arabic-voice-agent-prod \
  --query "Stacks[0].Outputs" --output table
```

Look for:
- `WebAppUrl` output → extract the CloudFront domain (e.g., `d1234abcdef.cloudfront.net`) — used for `mishmish.ai` and `www.mishmish.ai`
- `AdminUrl` output → extract the CloudFront domain — used for `admin.mishmish.ai`

### App Runner domains (for api, claude)
```bash
aws apprunner describe-custom-domains --service-arn <arn> --query "CustomDomains"
```

Or get the service URLs from CloudFormation outputs:
- `ApiUrl` → strip `https://` to get the CNAME target for `api.mishmish.ai`
- `ClaudeAgentUrl` → strip `https://` to get the CNAME target for `claude.mishmish.ai`

**Note:** App Runner custom domains also require ACME validation CNAME records (usually `_<hash>.<subdomain>.mishmish.ai` → `_<hash>.<something>.acm-validations.aws`). Check the App Runner console or `describe-custom-domains` output for these.

## Browser Automation Workflow

### Step 0: Get a tab

```
tabs_context_mcp (createIfEmpty: true)
tabs_create_mcp  → get a fresh tabId
```

### Step 1: Navigate to Spaceship and log in

1. Navigate to `https://spaceship.com` using `navigate` tool
2. Take a screenshot to see the current state
3. Look for a "Log in" or "Sign in" link and click it
4. **Stop and ask the user to enter their credentials.** Say something like: "I've navigated to the Spaceship login page. Please enter your email and password, then let me know once you're logged in."
5. Wait for the user to confirm they've logged in
6. Take a screenshot to verify login succeeded

**Never enter the user's password or credentials — always ask them to do it themselves.**

### Step 2: Navigate to DNS management

1. After login, navigate to the domain management area. Look for "Domains" in the navigation
2. Find and click on `mishmish.ai` in the domain list
3. Look for a "DNS" or "DNS Records" tab/section and click it
4. Take a screenshot to see the current DNS records

### Step 3: Read current records

1. Use `read_page` or `get_page_text` to extract the current DNS records from the page
2. Present the current records to the user in a table format
3. Compare them against the expected AWS targets (fetched in the earlier step)

### Step 4: Perform the requested operation

#### Viewing records
Just display what's there and note any mismatches with expected AWS values.

#### Adding a record
1. Find and click the "Add Record" or "+" button
2. Select the record type (CNAME, A, TXT, MX, etc.)
3. Fill in the hostname/name field
4. Fill in the value/target field
5. Set TTL if applicable
6. Take a screenshot to show the user what will be added
7. **Ask the user to confirm before saving**
8. Click Save/Add

#### Editing a record
1. Find the record to edit in the DNS table
2. Click the edit button/icon for that record
3. Update the value field
4. Take a screenshot to show the change
5. **Ask the user to confirm before saving**
6. Click Save

#### Deleting a record
1. Find the record to delete
2. Click the delete button/icon
3. Take a screenshot of the confirmation dialog
4. **Ask the user to confirm the deletion**
5. Confirm the deletion

### Step 5: Verify

After any changes:
1. Take a screenshot of the updated DNS records page
2. Summarize what was changed
3. Optionally suggest running `dig` or `nslookup` to verify propagation:
   ```bash
   dig +short api.mishmish.ai CNAME
   dig +short admin.mishmish.ai CNAME
   ```

## Sync Workflow

When the user asks to "sync DNS with AWS" or similar:

1. Fetch all current AWS target values (CloudFormation outputs + App Runner custom domains)
2. Navigate to Spaceship and read current DNS records
3. Compare and present a diff to the user:
   ```
   Record              Current Value              Expected Value         Status
   mishmish.ai         d1old.cloudfront.net       d1new.cloudfront.net   MISMATCH
   www.mishmish.ai     d1old.cloudfront.net       d1new.cloudfront.net   MISMATCH
   admin.mishmish.ai   dadmin.cloudfront.net      dadmin.cloudfront.net  OK
   api.mishmish.ai     abc123.awsapprunner.com    abc123.awsapprunner.com OK
   ```
4. Ask the user which records to update
5. Apply the changes one by one, confirming each

## Important Rules

- **Never enter passwords or credentials.** Always ask the user to log in themselves.
- **Always confirm before saving changes.** Show the user exactly what will change before clicking save/submit.
- **Always confirm before deleting.** Deletion of DNS records can cause downtime.
- **Take screenshots frequently** so the user can see what's happening and catch mistakes.
- **Only manage mishmish.ai** and its subdomains. Do not touch other domains.
