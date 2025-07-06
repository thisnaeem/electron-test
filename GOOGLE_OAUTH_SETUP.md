# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your Electron application.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Make sure billing is enabled (required for OAuth)

## Step 2: Enable the Google+ API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google+ API" or "People API"
3. Click on it and click **"Enable"**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **"Create Credentials"** > **"OAuth 2.0 Client ID"**
3. Configure the OAuth consent screen if prompted:
   - User Type: External (for most cases)
   - App name: "CSV Gen Pro" (or your preferred name)
   - User support email: Your email
   - Developer contact information: Your email
4. Choose **"Desktop application"** as the application type
5. Give it a name like "CSV Gen Pro Desktop"
6. For authorized redirect URIs, add: `http://localhost:3000/auth/callback`

## Step 4: Download and Configure Credentials

1. After creating the OAuth client, click the download button to get the JSON file
2. You'll get a file with content like this:
```json
{
  "installed": {
    "client_id": "your-client-id.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost"]
  }
}
```

3. Update your `.env` file with the credentials:
```env
# Database
DATABASE_URL="postgresql://neondb_owner:npg_CBElrvaM43gW@ep-bitter-thunder-a5ca6toh-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Google OAuth - Replace with your actual credentials
GOOGLE_CLIENT_ID="your-client-id.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

## Step 5: Test the Integration

1. Make sure your `.env` file has the correct credentials
2. Run the development server:
```bash
npm run dev
```
3. Click the profile icon in the sidebar
4. Click "Continue with Google"
5. You should be redirected to Google's authentication page

## Important Notes

- **Security**: Never commit your `.env` file to version control
- **Production**: For production builds, you'll need to set up environment variables in your build/deployment process
- **Redirect URI**: Make sure `http://localhost:3000/auth/callback` is added to your OAuth client's authorized redirect URIs

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure `http://localhost:3000/auth/callback` is exactly in your OAuth client's redirect URIs
- Check that there are no extra spaces or characters

### "invalid_client" error
- Verify your client ID and client secret are correct in the `.env` file
- Make sure there are no extra quotes or spaces

### "access_denied" error
- This usually happens when the user clicks "Cancel" on the Google consent screen
- Make sure your OAuth consent screen is properly configured

## Next Steps

Once authentication is working:
1. The user's profile will appear in the sidebar
2. User data will be stored in your Neon Postgres database
3. Users can sign out by clicking their profile and selecting "Sign out"

## Database Schema

The integration automatically creates/updates these database records:
- **User**: Basic profile information (name, email, image)
- **Account**: OAuth account details and tokens
- **UserMetadata**: Usage statistics and activity tracking

## Privacy and Security

- User tokens are securely stored in the database
- The app only requests basic profile information (name, email, picture)
- Users can revoke access through their Google account settings at any time
