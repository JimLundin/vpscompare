# GitHub Actions Workflows

This document describes the automated workflows configured for the VPS Compare project.

## Overview

The project uses GitHub Actions for continuous integration, deployment, and maintenance. All workflows are located in `.github/workflows/`.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Trigger:** Push to non-main branches, Pull Requests to main

**Purpose:** Validate code quality before merging

**Jobs:**
- **Test**: Runs unit tests and type checking
  - Runs `npm run test:run` (56 tests)
  - Runs `npx astro check` for TypeScript validation
- **Build**: Verifies the site builds successfully
  - Runs `npm run build`
  - Checks for `dist/` directory
  - Uses optional API keys from secrets

**When it runs:**
- Every push to feature branches
- Every pull request to main branch

**Status:** ✅ Required to pass before merging PRs

---

### 2. Deploy Workflow (`deploy.yml`)

**Trigger:** Push to main branch, Manual workflow dispatch

**Purpose:** Deploy to GitHub Pages after validation

**Jobs:**
1. **Test**: Runs tests and type checking (same as CI)
2. **Build**: Builds the production site
   - Uses API keys from secrets
   - Creates artifact for deployment
3. **Deploy**: Deploys to GitHub Pages
   - Only runs if tests and build succeed

**Environment Variables Required:**
- `DIGITALOCEAN_API_KEY` (optional, stored in secrets)
- `HETZNER_API_KEY` (optional, stored in secrets)

**When it runs:**
- Automatically on push to main
- Manually via workflow dispatch

**Deployment URL:** https://jimlundin.github.io/vpscompare

---

### 3. Scheduled Tests (`scheduled-tests.yml`)

**Trigger:** Daily at 6 AM UTC, Manual workflow dispatch

**Purpose:** Monitor provider API health and catch breaking changes

**Jobs:**
- **Test**: Runs unit tests and attempts live build
  - Continues on build error (non-blocking)
  - Tests if provider APIs are still functional
- **Notify**: Creates GitHub issue on failure
  - Only runs if tests fail
  - Avoids duplicate issues
  - Labels: `automated`, `ci-failure`, `bug`

**When it runs:**
- Daily at 6:00 AM UTC
- Can be triggered manually

**Notification:** Creates issue if APIs have changed or tests fail

---

### 4. Dependabot (`dependabot.yml`)

**Purpose:** Automatically update dependencies

**Configuration:**
- **npm dependencies**: Checked weekly on Mondays at 6 AM
  - Groups minor/patch updates together
  - Separate groups for dev and production dependencies
  - Maximum 10 open PRs
- **GitHub Actions**: Checked weekly on Mondays
  - Updates action versions automatically

**Labels:**
- `dependencies` - All dependency updates
- `automated` - Automated PRs
- `github-actions` - Action version updates

**Commit Message Prefixes:**
- `deps:` for npm dependencies
- `ci:` for GitHub Actions

---

## Workflow Diagram

```
┌─────────────────┐
│  Push to Branch │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │   CI   │  ← Run tests + type check + build
    └────┬───┘
         │
         ▼
    ┌─────────┐
    │   PR    │  ← Review + merge
    └────┬────┘
         │
         ▼
  ┌──────────────┐
  │ Push to Main │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │    Deploy    │  ← Test → Build → Deploy to Pages
  └──────────────┘
```

---

## Setting Up Secrets

To enable full functionality, add these secrets in GitHub:

**Repository Settings → Secrets and variables → Actions → New repository secret**

### Required for Production Builds:
```
DIGITALOCEAN_API_KEY
  - Get from: https://cloud.digitalocean.com/account/api/tokens
  - Permissions: Read-only

HETZNER_API_KEY
  - Get from: https://console.hetzner.cloud/projects
  - Select project → Security → API tokens
  - Permissions: Read-only
```

**Note:** API keys are optional. If not provided, the loaders will skip those providers and log warnings.

---

## Manual Workflow Triggers

All workflows can be triggered manually:

1. Go to **Actions** tab
2. Select the workflow
3. Click **Run workflow**
4. Choose branch (if applicable)
5. Click **Run workflow** button

---

## Status Badges

Add these badges to your README.md:

```markdown
![CI Status](https://github.com/JimLundin/vpscompare/workflows/CI/badge.svg)
![Deploy Status](https://github.com/JimLundin/vpscompare/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)
![Scheduled Tests](https://github.com/JimLundin/vpscompare/workflows/Scheduled%20Tests/badge.svg)
```

---

## Monitoring & Maintenance

### Check Workflow Status
- Visit: `https://github.com/JimLundin/vpscompare/actions`
- Filter by workflow or branch
- Review logs for failed runs

### Common Issues

#### Tests Fail on CI but Pass Locally
- Check Node.js version (should be 20)
- Ensure all dependencies are installed (`npm ci`)
- Check for environment-specific code

#### Build Fails on Deploy
- Verify API keys are set in secrets
- Check if provider APIs have changed
- Review scheduled test notifications

#### Dependabot PRs
- Review changes in each dependency
- Run tests locally before merging
- Update major versions carefully

---

## Performance Optimization

### Caching
All workflows use npm cache to speed up installations:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

### Concurrency
Deploy workflow uses concurrency control to prevent overlapping deployments:
```yaml
concurrency:
  group: "pages"
  cancel-in-progress: false
```

---

## Security Best Practices

✅ **Implemented:**
- API keys stored in secrets (not committed to code)
- Read-only permissions for provider APIs
- Automated dependency updates via Dependabot
- No secrets in logs or build outputs

⚠️ **Recommendations:**
- Rotate API keys quarterly
- Review Dependabot PRs before merging
- Monitor scheduled test notifications
- Keep GitHub Actions up to date

---

## Testing Workflows Locally

### Using Act (GitHub Actions Local Runner)

Install Act: https://github.com/nektos/act

```bash
# Test CI workflow
act pull_request -W .github/workflows/ci.yml

# Test deploy workflow (requires secrets)
act push -W .github/workflows/deploy.yml --secret-file .secrets

# List available workflows
act -l
```

### Manual Testing

```bash
# Run what CI runs
npm ci
npm run test:run
npx astro check
npm run build

# Check build output
ls -la dist/
```

---

## Workflow Maintenance

### Adding a New Workflow

1. Create file in `.github/workflows/<name>.yml`
2. Define trigger conditions
3. Add jobs and steps
4. Test locally with Act
5. Commit and push
6. Monitor first run in Actions tab

### Modifying Existing Workflows

1. Edit workflow file
2. Test changes on feature branch
3. Review workflow run results
4. Merge to main after validation

---

## Future Enhancements

Potential additions:
- [ ] Code coverage reporting (Codecov integration)
- [ ] Lighthouse CI for performance monitoring
- [ ] Visual regression testing
- [ ] Automated PR labeling
- [ ] Slack/Discord notifications
- [ ] Release automation
- [ ] Staging environment deployment

---

## Support

For issues with workflows:
1. Check workflow logs in Actions tab
2. Review this documentation
3. Check GitHub Actions documentation: https://docs.github.com/en/actions
4. Create an issue with `ci` label

---

Last Updated: 2025-11-06
