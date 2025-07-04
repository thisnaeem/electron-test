# Electron Auto-Update Setup Guide

This document provides a complete guide for setting up auto-updates for your Electron application using GitHub releases.

## Overview

The auto-update system uses `electron-updater` to automatically check for, download, and install updates from GitHub releases. The system is configured to work with both development and production environments.

## Prerequisites

1. **GitHub Repository**: Your project must be hosted on GitHub
2. **GitHub Token**: You need a GitHub personal access token with appropriate permissions
3. **Code Signing**: Required for macOS (recommended for Windows)

## Configuration Files

### 1. electron-builder.yml

The main configuration file for building and publishing:

```yaml
publish:
  provider: github
  owner: YOUR_GITHUB_USERNAME
  repo: YOUR_REPOSITORY_NAME
  private: false
  releaseType: release
```

**Important**: Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPOSITORY_NAME` with your actual GitHub username and repository name.

### 2. dev-app-update.yml

Configuration for development testing:

```yaml
provider: github
owner: YOUR_GITHUB_USERNAME
repo: YOUR_REPOSITORY_NAME
private: false
releaseType: release
updaterCacheDirName: electron-app-updater
```

## Setup Steps

### Step 1: Update Configuration

1. Edit `electron-builder.yml` and replace the placeholder values:
   - `YOUR_GITHUB_USERNAME`: Your GitHub username
   - `YOUR_REPOSITORY_NAME`: Your repository name

2. Edit `dev-app-update.yml` with the same values

### Step 2: Set Up GitHub Token

Create a GitHub personal access token:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with the following permissions:
   - `repo` (for private repositories)
   - `public_repo` (for public repositories)
3. Set the token as an environment variable:

```bash
# Windows
set GH_TOKEN=your_github_token_here

# macOS/Linux
export GH_TOKEN=your_github_token_here
```

### Step 3: Code Signing (Required for macOS)

For macOS, you need to sign your application:

1. Get an Apple Developer certificate
2. Configure code signing in `electron-builder.yml`:

```yaml
mac:
  identity: "Your Developer ID"
  notarize: true
```

## Building and Publishing

### Development Testing

1. **Build for testing**:
   ```bash
   npm run build:win    # Windows
   npm run build:mac    # macOS
   npm run build:linux  # Linux
   ```

2. **Test auto-updates in development**:
   ```bash
   npm run dev
   ```
   The app will use `dev-app-update.yml` for testing.

### Production Release

1. **Update version** in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Build and publish**:
   ```bash
   npm run publish:win    # Windows
   npm run publish:mac    # macOS
   npm run publish:linux  # Linux
   npm run publish:all    # All platforms
   ```

3. **Create GitHub Release**:
   - Go to your GitHub repository
   - Click "Releases" → "Create a new release"
   - Tag version: `v1.0.1`
   - Title: `Release v1.0.1`
   - Upload the built files from the `dist` folder

## Auto-Update Features

### Automatic Update Check

The app automatically checks for updates:
- On startup (after 3 seconds)
- When manually triggered via UI

### User Interface

The app includes a built-in update interface with:
- **Check for Updates**: Manually check for available updates
- **Download Update**: Download the latest version
- **Install & Restart**: Install the update and restart the app

### Update Flow

1. **Check for Updates**: App queries GitHub for new releases
2. **Update Available**: User is notified via dialog
3. **Download Progress**: Progress is logged to console
4. **Update Downloaded**: User is prompted to restart
5. **Install & Restart**: App installs update and restarts

## Event Handling

The auto-updater emits the following events:

- `checking-for-update`: When checking for updates
- `update-available`: When an update is found
- `update-not-available`: When no update is available
- `error`: When an error occurs
- `download-progress`: During download
- `update-downloaded`: When download completes

## Debugging

### Development Logging

In development mode, detailed logs are written to:
- Console output
- Electron log files

### Common Issues

1. **"No update available"**: 
   - Check if the version in `package.json` is higher than the published version
   - Verify GitHub release exists and is properly tagged

2. **"Update check failed"**:
   - Verify GitHub token is set correctly
   - Check repository permissions
   - Ensure release files are properly uploaded

3. **"Download failed"**:
   - Check network connectivity
   - Verify release files are accessible
   - Check file permissions

### Testing Updates

1. **Local Testing**:
   ```bash
   # Build current version
   npm run build:win
   
   # Update version in package.json
   # Build new version
   npm run build:win
   
   # Run old version and test update
   npm run dev
   ```

2. **Production Testing**:
   - Create a test release with a higher version
   - Install the current version
   - Test the update process

## Security Considerations

1. **Code Signing**: Always sign your releases for security
2. **HTTPS**: Updates are downloaded over HTTPS
3. **Checksums**: Files are verified using SHA512 checksums
4. **Private Repositories**: Use GitHub tokens for private repos

## Best Practices

1. **Version Management**: Use semantic versioning (e.g., 1.0.0, 1.0.1)
2. **Release Notes**: Always include release notes in GitHub releases
3. **Staged Rollouts**: Use staged rollouts for major updates
4. **Testing**: Test updates thoroughly before releasing
5. **Backup**: Keep backup copies of releases

## Troubleshooting

### Environment Variables

Ensure these are set correctly:
```bash
GH_TOKEN=your_github_token
```

### File Structure

After building, ensure these files exist in `dist`:
- `latest.yml` (Windows)
- `latest-mac.yml` (macOS)
- `latest-linux.yml` (Linux)
- Application installers

### GitHub Release Structure

Your GitHub release should contain:
- Release notes
- Tagged version (e.g., v1.0.1)
- Uploaded installer files

## API Reference

### Main Process

```typescript
import { autoUpdater } from 'electron-updater'

// Check for updates
autoUpdater.checkForUpdates()

// Download update
autoUpdater.downloadUpdate()

// Install and restart
autoUpdater.quitAndInstall()
```

### Renderer Process

```typescript
// Check for updates
await window.api.checkForUpdates()

// Download update
await window.api.downloadUpdate()

// Install and restart
await window.api.quitAndInstall()
```

## Support

For issues and questions:
1. Check the [electron-updater documentation](https://www.electron.build/auto-update)
2. Review the [electron-builder documentation](https://www.electron.build/)
3. Check GitHub issues for common problems

## Changelog

- **v1.0.0**: Initial auto-update implementation
- Added GitHub releases integration
- Added user interface for update controls
- Added comprehensive error handling
- Added development testing support 