# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies from the workspace root (this repo uses pnpm hoisting):

   ```bash
   pnpm install
   ```

2. Start the app with pnpm so Metro sees the workspace configuration:

   ```bash
   pnpm --filter nativewallet start
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
pnpm --filter nativewallet reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Monorepo notes

- The Metro config watches the repository root and forces `react`, `react-dom`, and `react-native` to resolve from the hoisted `node_modules`. This avoids the "Invalid hook call" error that happens when Expo loads two copies of React.
- Because dependencies are shared, avoid running package managers (npm/yarn) inside this folder—stick with `pnpm` at the root.
- Workspace packages (e.g. `@openlv/*`) can be imported directly; Metro already follows their symlinks.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View the open-source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
