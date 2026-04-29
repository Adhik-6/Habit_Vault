# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## TODO
1. The duration type of the habit doesn't seem to be working when the timer icon button is clickec.
2. Let the users group the habits based on category. The user can create their own categories, add the habits to a existing category or create a new one. These categories must be visible in the home screen so that the user can track their habits based on category. Modify the other pages to make use of the categories.
3. Combine calendar and today page into a single page showing the montly calendar and other stuff from the today page. 
4. Instead of the "Calendar" page, keep a "Habits" page showing the list of all habits the user has created and allow the user to tap on a habit to view the details of that habit. This page is supposed to show the dashboard of that particularily clicked habit. This should have the option to edit or delete the habit.
5. Remove the "+" icon present at the top in the "today" page. Also remove the "weekday performance" section from the insights page.
6. In the Insigts page > habits tab, the habit performance is not showing up for habits that have weekly frequency type. When clicked on the habits on this page, better make it redirect to the habit's dashboard page (as per TODO item 4).
7. The heatmap is not updating swiftly. If update the habits' completion in the today page, the heatmap in the dashboard page is only updated when the app is reloaded.
8. The components in the dashboard is disappearing when I open it but they again appear soon as I try to rearrange them.
9. Many components only update their state when I reload the app not when the data changes.
10. Many files in the project seems to have a lot of unused code lines which i guess is a byproduct of the hallucination of AI. Try to figure it out and remove or develop the codes accordingly.
11. The export CSV option is not seem to be working.
12. Test the web version and make sure it works fine.