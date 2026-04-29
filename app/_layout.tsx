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
import { precomputeAnalytics, useHabitStore } from '@store/useHabitStore';
import { useMoodStore } from '@store/useMoodStore';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
// 1. Swap the Expo status bar for React Native's native status bar
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep splash visible until fonts + DB are ready
SplashScreen.preventAutoHideAsync();

// Override the React Navigation dark theme to match our design system
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

  const loadHabits = useHabitStore((s) => s.loadHabits);
  const habits = useHabitStore((s) => s.habits);
  const loadMoodLogs = useMoodStore((s) => s.loadMoodLogs);
  const recomputeAll = useAnalyticsStore((s) => s.recomputeAll);

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Initialize SQLite (idempotent — runs migrations once)
        await initDatabase();
        // 2. Load initial data into Zustand stores
        await loadHabits();
        await loadMoodLogs();
        // 3. Precompute analytics in the background (non-blocking)
        recomputeAll();
      } catch (e) {
        console.error('[Bootstrap] Error:', e);
      }
    }
    bootstrap();
  }, []);

  // Background streak/score precompute after habits are loaded
  useEffect(() => {
    if (habits.length > 0) {
      precomputeAnalytics(habits);
    }
  }, [habits.length]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && habits !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, habits]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={AppTheme}>
          {/* 2. Move the StatusBar up here so it wraps the Stack, and use barStyle="light-content" */}
          <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', headerShown: false }}
            />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}