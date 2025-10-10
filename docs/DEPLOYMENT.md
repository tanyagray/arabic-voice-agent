# Deployment Guide

Guide for deploying Arabic Voice Agent to production.

## Overview

- **Database & Auth**: Supabase (managed)
- **Voice Infrastructure**: LiveKit Cloud (managed)
- **Agent Backend**: Render (background worker)
- **Mobile Apps**: App Store & Google Play

---

## Prerequisites

- Completed [SETUP.md](SETUP.md)
- Production API keys for all services
- Render account
- Apple Developer account (for iOS)
- Google Play Developer account (for Android)

---

## Part 1: Supabase Production Setup

### 1. Upgrade to Production Plan

1. Go to Supabase dashboard → Billing
2. Upgrade from Free to Pro (or appropriate tier)
3. Enable Point-in-Time Recovery (recommended)

### 2. Run Production Migrations

```bash
supabase db push --db-url "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

### 3. Configure Production Auth

1. Authentication → URL Configuration
2. Set Site URL to your production domain
3. Add production redirect URLs:
   - iOS: `com.arabicvoice.arabicvoiceagent://login-callback`
   - Android: `com.arabicvoice.arabicvoiceagent://login-callback`

### 4. Set Up RLS Policies

All RLS policies are already defined in migrations. Verify:

```bash
supabase db lint
```

### 5. Enable Database Backups

1. Database → Backups
2. Enable automatic daily backups
3. Configure retention period

---

## Part 2: LiveKit Cloud Production

### 1. Upgrade Plan

1. Choose appropriate plan based on usage
2. Consider:
   - Expected concurrent users
   - Average call duration
   - Bandwidth requirements

### 2. Configure Production Settings

1. Settings → General
   - Enable recording (optional)
   - Set session limits
   - Configure disconnect timeout

### 3. Set Up Webhooks

1. Settings → Webhooks
2. Add production webhook URL: `https://your-agent.onrender.com/webhook`
3. Enable events:
   - `room_started`
   - `room_finished`
   - `participant_joined`
   - `participant_left`

---

## Part 3: Deploy Agent to Render

### Option A: Using render.yaml (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Render Service**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect GitHub repository
   - Select `render.yaml`
   - Click "Apply"

3. **Configure Environment Variables**:
   - Go to service → Environment
   - Add all secrets from `.env`:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `LIVEKIT_API_KEY`
     - `LIVEKIT_API_SECRET`
     - `LIVEKIT_URL`
     - `OPENAI_API_KEY`
     - `ELEVENLABS_API_KEY`
     - `ELEVENLABS_VOICE_ID`
     - `DEEPGRAM_API_KEY`
     - `ARABIC_DIALECT`

4. **Deploy**:
   - Service will auto-deploy on push to `main`
   - Or manually trigger: Dashboard → Manual Deploy

### Option B: Manual Setup

1. **Create Background Worker**:
   - New + → Background Worker
   - Connect GitHub repo
   - Build Command: `pip install -r livekit-agent/requirements.txt`
   - Start Command: `cd livekit-agent && python src/main.py start`

2. **Configure Environment**:
   - Python Version: 3.11
   - Add all environment variables

3. **Deploy**:
   - Click "Create Background Worker"

### Verify Deployment

Check logs:
```bash
# Via Render dashboard
# Or using Render CLI
render logs -s your-service-name
```

---

## Part 4: Mobile App Deployment

### iOS App Store

#### 1. Prepare for Release

```bash
cd mobile-app

# Update version in pubspec.yaml
version: 1.0.0+1

# Build release
flutter build ios --release
```

#### 2. Configure Xcode

1. Open `ios/Runner.xcworkspace`
2. Select Runner → Signing & Capabilities
3. Set Team and Bundle Identifier
4. Ensure "Automatically manage signing" is checked

#### 3. Archive and Upload

1. Product → Archive
2. Distribute App → App Store Connect
3. Upload

#### 4. App Store Connect

1. Go to https://appstoreconnect.apple.com
2. My Apps → + → New App
3. Fill in app information:
   - Name: Arabic Voice Agent
   - Primary Language: English
   - Bundle ID: com.arabicvoice.arabicvoiceagent
   - SKU: unique identifier
4. Upload screenshots (required sizes)
5. Write app description
6. Set pricing and availability
7. Submit for review

### Android Google Play

#### 1. Prepare for Release

```bash
cd mobile-app

# Generate signing key
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# Create key.properties
echo "storePassword=your-password
keyPassword=your-password
keyAlias=upload
storeFile=/path/to/upload-keystore.jks" > android/key.properties

# Build release
flutter build appbundle --release
```

#### 2. Configure Signing

Edit `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

#### 3. Google Play Console

1. Go to https://play.google.com/console
2. Create Application
3. Complete Store Listing:
   - App name
   - Short description
   - Full description
   - Screenshots (phone, tablet)
   - Feature graphic
   - App icon
4. Content Rating questionnaire
5. Target audience
6. Upload AAB: `build/app/outputs/bundle/release/app-release.aab`
7. Submit for review

---

## Part 5: CI/CD Setup

### GitHub Secrets

Add to repository secrets:

```
RENDER_API_KEY=your-render-api-key
RENDER_SERVICE_ID=your-service-id
```

### Auto-Deploy on Push

Workflows are already configured in `.github/workflows/`:
- `deploy-agent.yml` - Auto-deploys agent to Render
- `test-mobile.yml` - Runs Flutter tests

Enable:
1. Go to GitHub repo → Settings → Secrets
2. Add required secrets
3. Push to `main` branch triggers deployment

---

## Part 6: Monitoring & Maintenance

### Monitoring

**Render:**
- Dashboard → Metrics
- Set up alerts for:
  - High memory usage
  - Error rate
  - Downtime

**Supabase:**
- Dashboard → Reports
- Monitor:
  - Database size
  - API requests
  - Auth users

**LiveKit:**
- Dashboard → Analytics
- Track:
  - Concurrent connections
  - Call duration
  - Bandwidth usage

### Logs

**Agent Logs:**
```bash
render logs -s arabic-voice-agent --tail
```

**Supabase Logs:**
- Dashboard → Logs Explorer

### Backups

**Database:**
- Automatic daily backups (Supabase)
- Download manual backup:
  ```bash
  supabase db dump -f backup.sql
  ```

**Code:**
- GitHub (version controlled)
- Tag releases:
  ```bash
  git tag -a v1.0.0 -m "Release v1.0.0"
  git push origin v1.0.0
  ```

---

## Part 7: Scaling Considerations

### Database

- Monitor query performance
- Add indexes as needed
- Consider read replicas for high traffic

### Agent

- Render auto-scales workers
- Monitor concurrency limits
- Upgrade plan if needed

### LiveKit

- Upgrade plan for more concurrent users
- Consider regional deployment

### Mobile Apps

- Use CDN for assets
- Optimize images
- Lazy load conversation history

---

## Security Checklist

- [ ] All API keys in environment variables (not code)
- [ ] RLS enabled on all Supabase tables
- [ ] HTTPS/WSS only
- [ ] OAuth redirect URLs whitelisted
- [ ] Service role key never exposed to clients
- [ ] Regular dependency updates
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting configured

---

## Rollback Procedure

If deployment fails:

1. **Render**: Use "Rollback" button in dashboard
2. **Supabase**: Restore from backup
3. **Mobile Apps**: Update app with hotfix, submit urgent review

---

## Cost Estimation

**Typical costs for 1000 monthly active users:**

- Supabase Pro: ~$25/month
- LiveKit Cloud: ~$50-200/month (usage-based)
- Render: ~$25/month (Starter plan)
- OpenAI GPT-4o: ~$100-300/month (usage-based)
- ElevenLabs: ~$50-100/month (usage-based)
- Deepgram: ~$30-80/month (usage-based)

**Total: ~$280-780/month**

Adjust based on actual usage patterns.

---

## Support & Updates

### Updating the Agent

1. Make changes to `livekit-agent/`
2. Test locally
3. Commit and push to `main`
4. Render auto-deploys
5. Monitor logs for errors

### Updating Mobile Apps

1. Make changes to `mobile-app/`
2. Increment version in `pubspec.yaml`
3. Build and test
4. Submit to App Store/Google Play
5. Review process: 1-3 days (Apple), 1-2 days (Google)

### Database Migrations

```bash
# Create new migration
supabase migration new migration_name

# Edit the file in supabase/migrations/

# Apply to production
supabase db push
```

---

## Next Steps

After deployment:
1. Test all features in production
2. Monitor logs and metrics
3. Set up user feedback collection
4. Plan feature roadmap
5. Regular security audits

For help, refer to:
- [SETUP.md](SETUP.md) for local development
- [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
