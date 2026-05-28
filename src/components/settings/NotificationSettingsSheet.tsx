import { useAccentColors } from '@/hooks/use-accent-colors';
import { Cards, Text as T } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, LogBox, Platform, Switch, Text, TouchableOpacity, View } from 'react-native';

// Ignore the SDK 53 Expo Go remote push warning since HabitVault uses local notifications
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

const NOTIFICATION_ID_KEY = 'notification_id';
const NOTIFICATION_ENABLED_KEY = 'notifications_enabled';
const NOTIFICATION_TIME_KEY = 'notifications_time';

/** Configure how notifications are displayed when the app is in the foreground. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request notification permissions. Returns true if granted. */
async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a daily repeating notification at the given hour/minute,
 * cancelling any previously scheduled one first.
 * Returns the new notification identifier.
 */
async function scheduleDailyReminder(hour: number, minute: number): Promise<string> {
  // Cancel the old notification, if any
  const oldId = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
  if (oldId) {
    await Notifications.cancelScheduledNotificationAsync(oldId).catch(() => { });
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏆 HabitVault',
      body: "Time to log your habits and mood. Keep the streak alive!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY, // We must explicitly declare the type
      hour,
      minute,
    },
  });

  await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id);
  return id;
}

/** Cancel the currently scheduled daily reminder. */
async function cancelDailyReminder(): Promise<void> {
  const oldId = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
  if (oldId) {
    await Notifications.cancelScheduledNotificationAsync(oldId).catch(() => { });
    await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
  }
}

export interface NotificationSettingsSheetRef {
  open: () => void;
}

export const NotificationSettingsSheet = React.forwardRef<NotificationSettingsSheetRef>(
  (_, ref) => {
    const sheetRef = useRef<BottomSheetRef>(null);
    const ac = useAccentColors();
    const [enabled, setEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      loadSettings();
    }, []);

    const loadSettings = async () => {
      try {
        const storedEnabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
        const storedTime = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);
        if (storedEnabled === 'true') setEnabled(true);
        if (storedTime) setReminderTime(new Date(parseInt(storedTime, 10)));
      } catch (e) {
        console.warn('[Notifications] Failed to load settings:', e);
      }
    };

    const saveSettings = async (isEnabled: boolean, time: Date) => {
      setIsSaving(true);
      try {
        await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, isEnabled.toString());
        await AsyncStorage.setItem(NOTIFICATION_TIME_KEY, time.getTime().toString());

        if (isEnabled) {
          const granted = await requestPermissions();
          if (!granted) {
            Alert.alert(
              'Permission Required',
              'Please allow notifications in your device Settings to receive reminders.',
            );
            // Revert toggle since we can't schedule without permission
            setEnabled(false);
            await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, 'false');
            return;
          }

          await scheduleDailyReminder(time.getHours(), time.getMinutes());
          Alert.alert(
            'Reminder Set ✅',
            `You'll receive a daily reminder at ${formatTime(time)}.`,
          );
        } else {
          await cancelDailyReminder();
        }
      } catch (e: any) {
        console.warn('[Notifications] Failed to save settings:', e);
        Alert.alert('Error', `Could not update notification settings: ${e?.message ?? e}`);
      } finally {
        setIsSaving(false);
      }
    };

    React.useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.open(),
    }));

    const handleToggle = (val: boolean) => {
      setEnabled(val);
      saveSettings(val, reminderTime);
    };

    const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowPicker(Platform.OS === 'ios');
      if (selectedDate) {
        setReminderTime(selectedDate);
        if (enabled) {
          saveSettings(true, selectedDate);
        }
      }
    };

    const formatTime = (date: Date) =>
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <BottomSheet ref={sheetRef} title="Notifications">
        <View style={{ gap: Spacing[4], paddingBottom: Spacing[8] }}>
          <View style={[Cards.compact, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <Text style={T.bodyMedium}>Daily Reminders</Text>
              <Text style={T.caption}>Remind me to log my mood and habits.</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={isSaving}
              trackColor={{ true: ac.accent, false: Colors.surface }}
              thumbColor={enabled ? '#FFF' : Colors.textMuted}
            />
          </View>

          {enabled && (
            <View style={[Cards.compact]}>
              <Text style={[T.label, { marginBottom: Spacing[3] }]}>Reminder Time</Text>
              <TouchableOpacity
                onPress={() => setShowPicker(!showPicker)}
                style={{
                  padding: Spacing[3],
                  backgroundColor: Colors.surfaceElevated,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: ac.accent,
                }}
              >
                <Text style={[T.h3, { color: ac.accent }]}>{formatTime(reminderTime)}</Text>
              </TouchableOpacity>

              {showPicker && (
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}
            </View>
          )}

          <View style={[Cards.compact, { gap: Spacing[2] }]}>
            <Text style={[T.label, { marginBottom: Spacing[1] }]}>ℹ️ How it works</Text>
            <Text style={[T.caption, { color: Colors.textSecondary, lineHeight: 18 }]}>
              HabitVault schedules a local notification directly on your device — no internet required.
              The reminder fires every day at your chosen time. Your data never leaves your device.
            </Text>
          </View>
        </View>
      </BottomSheet>
    );
  }
);