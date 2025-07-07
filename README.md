# electron-app

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## Splash Screen

The application features a modern, animated splash screen that appears when the app starts. The splash screen includes:

### Features
- **Animated gradient background** with floating particles
- **Glowing logo** with smooth animations
- **Real-time progress indicator** showing loading stages
- **App version display** fetched from the application
- **Smooth transitions** with CSS animations
- **Smart timing** - shows for 3-4 seconds

### Behavior
- **First launch**: Always shows the splash screen
- **Subsequent launches**: Shows splash screen only if more than 1 hour has passed since last shown
- **Development mode**: Add `?splash=true` to force show splash screen for testing

### Technical Details
- Built with React and Tailwind CSS
- Uses custom CSS animations for smooth effects
- Integrates with Electron's version API
- Responsive design that works on all screen sizes
- Optimized performance with efficient animations

The splash screen enhances the user experience by providing visual feedback during app initialization and creating a professional first impression.
