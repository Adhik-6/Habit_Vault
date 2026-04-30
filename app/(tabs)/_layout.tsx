import { Colors, Radius, Spacing, Typography } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Tab icon component ────────────────────────────────────────────────────────

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 32,
        borderRadius: Radius.lg,
        backgroundColor: focused ? Colors.accentMuted : 'transparent',
        marginBottom: 13,
      }}
    >
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

// ── Tab navigator ─────────────────────────────────────────────────────────────

export default function TabLayout() {
  // Dynamically get the device's safe area padding
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      // Global listener to trigger haptics on any tab press
      screenListeners={{
        tabPress: () => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accentGlow,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: Typography.fontFamily.medium,
          fontSize: 10,
          marginTop: -2,
          // Remove the hardcoded bottom margin
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          // Calculate height dynamically: base height (60) + bottom inset
          height: 60 + insets.bottom,
          paddingTop: Spacing[2],
          // Apply the exact inset needed for the device, or a small fallback
          paddingBottom: Math.max(insets.bottom, Spacing[2]),
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'today' : 'today-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'grid' : 'grid-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'library' : 'library-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'analytics' : 'analytics-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}