## Commands
1. `npm start` - Start the development server
2. `npx expo start -c` - Start the development server with cache clearing
3. `npx expo install eas-cli` - Install EAS CLI for building and submitting apps
4. `npx eas build:configure` - Configure EAS build for the project
5. `npx eas build -p android --profile production --clear-cache` - Build the Android app for production with cache clearing
6. `npx eas build -p ios --profile production --clear-cache` - Build the iOS app for production with cache clearing
7. `npx eas submit -p android --latest` - Take the latest build from EAS and upload it to the Google Play Store.
8. `npx expo install <package-name>` - Install a specific package using Expo's package manager (use this instead of `npm install` for Expo packages)

### Full Reset Script
```bash
# Run these commands at the root of the projects
rm -rf android
rm -rf ios
rm -rf node_modules
rm -rf .expo
rm -rf package-lock.json
npm install
npx expo prebuild --clean
npx eas build -p ios --profile production --clear-cache
```

### Workflow
1. Make changes
2. `npx expo start`
3. Test
4. `npx expo prebuild --clean` (if config/assets changed)
5. `npx eas build -p android --profile production --clear-cache`
6. Install APK