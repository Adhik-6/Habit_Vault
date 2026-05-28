import '../global.css';

import { initDatabase } from '@db/database';
import { Colors } from '@design/tokens';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { useHabitStore } from '@store/useHabitStore';
import { useMoodStore } from '@store/useMoodStore';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, StatusBar, LogBox } from 'react-native'; // <-- Added AppState here
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// Silence the expo-notifications error explicitly
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('expo-notifications: Android Push notifications')) {
    return;
  }
  originalConsoleError(...args);
};

// Keep splash visible until fonts + DB are ready
SplashScreen.preventAutoHideAsync();

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.surface,
    border: Colors.border,
    text: Colors.text,
    notification: Colors.accent,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Split initialization into two strictly ordered steps
  const [dbReady, setDbReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // STEP 1: Initialize the SQLite Database
  useEffect(() => {
    async function prepareDb() {
      try {
        await initDatabase();

        // The "Magic" Fix: Give the Android SQLite Write-Ahead Log (WAL) 
        // a tiny 150ms breather to flush to the disk before querying it.
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (e) {
        console.error('[Bootstrap] DB Error:', e);
      } finally {
        setDbReady(true);
      }
    }
    prepareDb();
  }, []);

  // STEP 2: Fetch Data ONLY after the DB is fully locked and loaded
  useEffect(() => {
    if (!dbReady) return; // Do not fetch if the DB is asleep

    async function fetchData() {
      try {
        await useHabitStore.getState().loadHabits();
        await useMoodStore.getState().loadMoodLogs();
        useAnalyticsStore.getState().recomputeAll();
      } catch (e) {
        console.error('[Bootstrap] Data Fetch Error:', e);
      } finally {
        setDataLoaded(true);
      }
    }
    fetchData();
  }, [dbReady]);

  // STEP 3: Hide the Splash Screen safely
  useEffect(() => {
    if ((fontsLoaded || fontError) && dataLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dataLoaded]);

  // STEP 4: Bulletproof Foreground Syncing
  // Whenever you close the app and reopen it from the background, 
  // silently fetch fresh data to guarantee no blank screens ever.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && dataLoaded) {
        useHabitStore.getState().loadHabits();
        useMoodStore.getState().loadMoodLogs();
      }
    });
    return () => subscription.remove();
  }, [dataLoaded]);

  // Prevent ANY rendering until everything is successfully in memory
  if ((!fontsLoaded && !fontError) || !dataLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={AppTheme}>
          <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen name="habit/[id]" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}