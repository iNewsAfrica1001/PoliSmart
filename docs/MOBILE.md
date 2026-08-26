# AfricaCampaignAI Mobile Release Guide

AfricaCampaignAI is configured for responsive web, PWA installation, Android packaging, and iOS packaging.

## Web And PWA

1. Build the app with `npm run build`.
2. Serve `dist/` over HTTPS through the Node production server or a static CDN in front of the API.
3. Confirm `manifest.webmanifest`, `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/apple-touch-icon.png`, and `/sw.js` are reachable.
4. Test install prompts on Chrome for Android and Safari Add to Home Screen on iPhone.

## Native Android

1. Install Android Studio and Android SDK.
2. Set a production API before sync:
   ```bash
   set VITE_API_BASE=https://api.your-domain.example
   npm run mobile:sync
   npm run mobile:android
   ```
3. In Android Studio, configure package signing, adaptive icons, version code, version name, and release build type.
4. Test on a physical Android device before Play Store submission.

## Native iOS

1. Use macOS with Xcode and an Apple Developer account.
2. Set the production API and sync:
   ```bash
   export VITE_API_BASE=https://api.your-domain.example
   npm run mobile:sync
   npm run mobile:ios
   ```
3. In Xcode, configure bundle signing, display name, version, build number, app icons, and capabilities.
4. Test on iPhone simulator and a physical iPhone before TestFlight submission.

## Production API Notes

- Native apps cannot rely on relative `/api` URLs once packaged. Always build mobile releases with `VITE_API_BASE`.
- The API CORS defaults include `capacitor://localhost`, `ionic://localhost`, and `https://localhost`.
- Production API traffic must use HTTPS.
- Keep `CLIENT_ORIGIN` explicit in hosted production deployments when possible.
