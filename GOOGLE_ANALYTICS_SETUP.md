# Google Analytics Setup Guide

This guide will help you set up Google Analytics for your Electron app to track user behavior and usage analytics.

## Features

- ✅ Page view tracking
- ✅ Tool usage analytics
- ✅ Feature usage tracking
- ✅ Error tracking
- ✅ App lifecycle events
- ✅ Privacy-focused (anonymous data only)
- ✅ User-controlled (can be disabled)

## Setup Instructions

### 1. Create a Google Analytics 4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account
3. Click "Start measuring" or create a new property
4. Set up your Google Analytics 4 property:
   - **Property name**: Your App Name (e.g., "CSV Generator Pro")
   - **Reporting time zone**: Your preferred timezone
   - **Currency**: Your preferred currency
5. In "About your business":
   - **Industry category**: Software/Technology
   - **Business size**: Select appropriate size
   - **How you intend to use Google Analytics**: Check relevant options
6. Accept the Terms of Service

### 2. Get Your Measurement ID

1. In your Google Analytics dashboard, go to **Admin** (gear icon)
2. In the **Property** column, click **Data Streams**
3. Click **Add stream** → **Web**
4. Configure your web stream:
   - **Website URL**: `electron://renderer/` (or use `localhost` for testing)
   - **Stream name**: Your app name
5. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

### 3. Configure Your App

#### Option A: Environment Variable (Recommended)
1. Create a `.env` file in your project root:
   ```env
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
2. Replace `G-XXXXXXXXXX` with your actual Measurement ID

#### Option B: Settings Interface
1. Launch your app
2. Go to **Settings** → **Analytics & Privacy**
3. Enable analytics and enter your Measurement ID

### 4. Testing Your Setup

1. Enable analytics in your app settings
2. Use different tools and features
3. Check your Google Analytics dashboard (data may take a few hours to appear)
4. Go to **Realtime** reports to see immediate activity

## What Data Is Collected

### ✅ We Collect (Anonymous):
- Page views (which screens are visited)
- Tool usage patterns (generators, converters, etc.)
- Feature interactions (button clicks, settings changes)
- Error occurrences (to help fix bugs)
- Performance metrics (app startup time, response times)
- App lifecycle events (startup, shutdown)

### ❌ We NEVER Collect:
- API keys or credentials
- Generated content or prompts
- Uploaded files or personal data
- User identification information
- Sensitive personal information

## Privacy & Compliance

### GDPR Compliance
- ✅ Anonymous data collection only
- ✅ User can disable analytics
- ✅ No personal data collected
- ✅ Data anonymization enabled
- ✅ IP anonymization enabled

### User Control
Users can:
- ✅ Disable analytics completely
- ✅ Use their own Google Analytics property
- ✅ View what data is collected

## Analytics Events Reference

### Tool Usage Events
```javascript
// Track when users start using a tool
analytics.trackToolUsage('image_generator', 'generate_start', {
  style: 'Realistic',
  aspect_ratio: '16:9',
  num_images: 4,
  prompt_length: 25
})

// Track successful operations
analytics.trackToolUsage('file_processor', 'process_success', {
  file_count: 10,
  processing_mode: 'extract'
})
```

### Page Views
```javascript
// Automatically tracked when users navigate
analytics.trackPageView('settings')
analytics.trackPageView('image-generator')
```

### App Events
```javascript
// Track app lifecycle
analytics.trackAppEvent('startup', {
  version: '1.0.10',
  platform: 'electron'
})
```

### Feature Usage
```javascript
// Track specific features
analytics.trackFeature('dark_mode_toggle', {
  enabled: true
})
```

## Advanced Configuration

### Custom Events
You can add custom tracking to new features:

```javascript
import analytics from './services/analytics'

// Track button clicks
analytics.trackEvent('button_click', {
  button_name: 'enhance_prompt',
  page: 'image_generator'
})

// Track user actions
analytics.trackAction('file_upload', 'background_remover', 'image_file', 1)
```

### Disable Analytics for Development
Add this to your `.env.local`:
```env
VITE_GA_MEASUREMENT_ID=
```

Or disable in settings interface.

## Troubleshooting

### Analytics Not Working
1. Check that Measurement ID is correct (format: `G-XXXXXXXXXX`)
2. Verify analytics is enabled in Settings
3. Check browser console for errors
4. Ensure internet connection is available

### Data Not Appearing in Google Analytics
1. Data can take 24-48 hours to appear in reports
2. Use **Realtime** reports for immediate verification
3. Check that events are being fired (browser console logs)

### Common Issues
- **CORS Errors**: Normal for Electron apps, analytics still works
- **Ad Blockers**: May block analytics in development
- **Offline Usage**: Events are queued and sent when online

## Data Retention

Google Analytics 4 default data retention:
- **Event data**: 14 months (can be extended to 38 months)
- **User data**: 14 months
- **Realtime data**: 48 hours

## Support

If you need help with analytics setup:
1. Check Google Analytics Help Center
2. Verify your Measurement ID format
3. Test with browser console open to see any errors
4. Use Realtime reports for immediate feedback

## Best Practices

1. **Test thoroughly** before deploying
2. **Respect user privacy** - always allow opt-out
3. **Monitor data quality** - check for accurate tracking
4. **Regular review** - analyze data to improve your app
5. **Documentation** - keep track of what events mean

---

**Remember**: Analytics should enhance your app development, not compromise user privacy. Always be transparent about data collection and respect user choices.
