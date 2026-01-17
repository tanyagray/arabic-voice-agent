# Claude Code Guidelines

This document contains guidelines and conventions for working with this project using Claude Code.

## Starting the App

When asked to "start the app", run the **"Start All Services"** launch configuration in VS Code. This starts all three services (Supabase, web-api, web-app) in separate terminals for log monitoring.

You can trigger this via:
- Keyboard: `Cmd+Shift+B` (default build task)
- Command Palette: `Tasks: Run Task` → `Start All Services`

## Git Commit Conventions

All git commits **MUST** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Examples

```
feat: add Arabic voice recognition support
fix: resolve audio processing latency issue
docs: update deployment instructions
refactor: simplify agent initialization logic
ci: add release-please workflow
```

### Breaking Changes

For breaking changes, add a `!` after the type/scope or include `BREAKING CHANGE:` in the footer:

```
feat!: change agent API endpoint structure

BREAKING CHANGE: The agent endpoint now requires authentication tokens
```

### Why Conventional Commits?

This project uses [release-please](.github/workflows/release-please.yml) for automated versioning and changelog generation, which depends on conventional commit messages to:
- Automatically determine version bumps (major/minor/patch)
- Generate meaningful changelogs
- Create GitHub releases

### Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Release Please Documentation](https://github.com/googleapis/release-please)
