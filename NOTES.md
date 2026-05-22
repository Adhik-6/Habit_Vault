## Commands
1. `npm start` - Start the development server
2. `npx expo start -c` - Start the development server with cache clearing
3. `npm install -g eas-cli` - Install EAS CLI for building and submitting apps
4. `eas login` - Log in to your Expo account through the CLI
5. `npx eas build:configure` - Configure EAS build for the project
6. `npx eas build -p android --profile production --clear-cache` - Build the Android app for production with cache clearing
7. `npx eas build -p ios --profile production --clear-cache` - Build the iOS app for production with cache clearing
8. `npx eas submit -p android --latest` - Take the latest build from EAS and upload it to the Google Play Store.
9. `npx expo install <package-name>` - Install a specific package using Expo's package manager (use this instead of `npm install` for Expo packages)
10. `npx expo run:android` - Run the app on an Android emulator or connected device


### Generating the APK using eas
1. `npm install -g eas-cli` - Install EAS CLI globally if you haven't already.
2. `eas login` - Log in to your Expo account through the CLI.
3. `npx eas build:configure` - Configure EAS build for the project (only needed the first time).
4. Open the generated eas.json and tell it to output an APK file instead of an AAB:
```json
{
  "cli": {
    "version": ">= 10.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```
5. `npx eas build -p android --profile production --clear-cache` - Build the Android app for production with cache clearing. This will generate an APK file due to the configuration in eas.json.
6. Once the build is complete, you can download the APK from the EAS build dashboard.

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
npx eas build -p android --profile production --clear-cache
```

### Workflow
1. Make changes
2. `npx expo start`
3. Test
4. `npx expo prebuild --clean` (if config/assets changed)
5. `npx eas build -p android --profile production --clear-cache`
6. Install APK

### Workflow in local building
1. Make changes
2. `npx expo prebuild --platform android --clean` - Only needed for first time initialization.
3. `cd android`
4. `./gradlew assembleRelease`
5. The final generated apk file is available at `android/app/build/outputs/apk/release/app-release.apk`

### If Ran into errors while building the app:
1. `cd ./android/`
2. `rm -rf app/.cxx app/build`
3. `./gradlew clean`
4. Finally `./gradlew assembleRelease`

### A Note on Counter Heatmap Intensity
- Regarding your note about the "Counter" heatmap not getting brighter: GitHub's actual contribution algorithm works by finding the highest activity recorded across the entire year, and grading every other day relative to that single maximum value.
- If you only log activity on a single day (even if you click it 100 times), that day is technically the "max" value for the year, so it will correctly default to the absolute brightest tier (Tier 4). It will only start showing different colored tiers once you log activity on a second day and compare the two days against each other.