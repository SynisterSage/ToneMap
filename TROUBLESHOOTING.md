# Troubleshooting Spotify OAuth

## Common issues when clicking "Connect Spotify"

### 1. App crashes or returns to homepage immediately
**Cause:** The OAuth redirect URL isn't being handled properly.

**Check:**
- Spotify Dashboard has `tonemap://auth` registered exactly
- iOS Info.plist has `CFBundleURLSchemes` with `tonemap` entry (✓ verified)
- AppDelegate has URL handler method (✓ added)

### 2. "Invalid redirect URI" or similar error
**Cause:** Mismatch between registered URI and what the app sends.

**Fix:**
- Ensure Spotify dashboard redirect URI is: `tonemap://auth`
- Case-sensitive, no trailing slash

### 3. Silent failure / no error shown
**Cause:** Safari View Controller opens but doesn't redirect back.

**Common fixes:**
- Make sure the bundle identifier in Xcode matches what's expected
- Check that the app is set as default handler for `tonemap://` scheme

## How to get detailed logs

### iOS Simulator logs:
```bash
npx react-native log-ios
```

### Xcode Console (best for native crashes):
1. Open `ios/ToneMap.xcworkspace` in Xcode
2. Run the app from Xcode (Cmd+R)
3. Watch the console output when you click Connect
4. Look for errors from `RNAppAuth` or native stack traces

### Metro bundler logs:
Check the terminal where you ran `npm start` or `npx react-native start`

## What to check in Spotify Dashboard
- Client ID: c1e41e230df9466986f6fcbfb6a34d1b (✓ set in config)
- Redirect URIs: Must include `tonemap://auth` exactly
- No client secret needed for PKCE mobile flow

## Recent fixes applied
- Added `usePKCE: true` to authorize call
- Added URL handler to AppDelegate.swift
- Enhanced error logging to show full error details
