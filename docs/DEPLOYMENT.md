# Deployment Guide

Guide for deploying Arabic Voice Agent to production.

## Overview

- **Database & Auth**: Supabase (managed)
- **Web API Backend**: Render or similar hosting
- **Web App**: Static hosting (Vercel, Netlify, etc.)
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

## Part 2: Deploy Web API to Render

### Option A: Manual Setup (Recommended)

1. **Create Web Service**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Build Command: `pip install -r web-api/requirements.txt`
   - Start Command: `cd web-api && uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Configure Environment**:
   - Python Version: 3.11
   - Add all environment variables from `web-api/.env`:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `OPENAI_API_KEY`
     - `ELEVEN_API_KEY`
     - `SONIOX_API_KEY`

3. **Deploy**:
   - Click "Create Web Service"
   - Service will auto-deploy on push to `main`

### Verify Deployment

Check logs:
```bash
# Via Render dashboard
# Or using Render CLI
render logs -s your-service-name
```

Test the API:
```bash
curl https://your-service.onrender.com/health
```

---

## Part 3: Deploy Web App

### Using Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd web-app
   vercel --prod
   ```

3. **Configure Environment**:
   - Add `VITE_API_URL` environment variable pointing to your Render Web API

### Using Netlify

1. **Build the app**:
   ```bash
   cd web-app
   npm run build
   ```

2. **Deploy**:
   - Drag and drop the `dist/` folder to Netlify
   - Or use Netlify CLI

---

## Part 4: Mobile App Deployment

### iOS App Store

#### 1. Prepare for Release

```bash
cd flutter-app

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
cd flutter-app

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

Add to repository secrets as needed for your deployment workflows.

### Auto-Deploy on Push

Configure GitHub Actions workflows in `.github/workflows/` for automatic deployments.

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

### Logs

**Web API Logs:**
```bash
render logs -s your-web-api-service --tail
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

### Web API

- Render auto-scales instances
- Monitor response times
- Upgrade plan if needed
- Consider caching layer (Redis)

### Web App

- Use CDN for static assets
- Optimize bundle size
- Enable compression

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

1. **Render (Web API)**: Use "Rollback" button in dashboard
2. **Vercel/Netlify (Web App)**: Rollback to previous deployment
3. **Supabase**: Restore from backup
4. **Mobile Apps**: Update app with hotfix, submit urgent review

---

## Cost Estimation

**Typical costs for 1000 monthly active users:**

- Supabase Pro: ~$25/month
- Render (Web API): ~$25/month (Starter plan)
- Vercel/Netlify (Web App): ~$0-20/month
- OpenAI GPT-4o: ~$100-300/month (usage-based)
- ElevenLabs: ~$50-100/month (usage-based)
- Soniox: ~$30-80/month (usage-based)

**Total: ~$230-550/month**

Adjust based on actual usage patterns.

---

## Support & Updates

### Updating the Web API

1. Make changes to `web-api/`
2. Test locally
3. Commit and push to `main`
4. Render auto-deploys
5. Monitor logs for errors

### Updating the Web App

1. Make changes to `web-app/`
2. Test locally with `npm run dev`
3. Build with `npm run build`
4. Deploy to Vercel/Netlify
5. Verify production deployment

### Updating Mobile Apps

1. Make changes to `flutter-app/`
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
