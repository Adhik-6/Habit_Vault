import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { Cards, Text as T, Buttons } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import { useAccentColors } from '@/hooks/use-accent-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

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

    useEffect(() => {
      loadSettings();
    }, []);

    const loadSettings = async () => {
      try {
        const storedEnabled = await AsyncStorage.getItem('notifications_enabled');
        const storedTime = await AsyncStorage.getItem('notifications_time');
        if (storedEnabled === 'true') setEnabled(true);
        if (storedTime) setReminderTime(new Date(parseInt(storedTime, 10)));
      } catch (e) {
        console.log(e);
      }
    };

    const saveSettings = async (isEnabled: boolean, time: Date) => {
      try {
        await AsyncStorage.setItem('notifications_enabled', isEnabled.toString());
        await AsyncStorage.setItem('notifications_time', time.getTime().toString());
        
        if (isEnabled) {
          // Notifications require a development build for Android on SDK 53+.
          // Mocking the behavior for Expo Go.
          console.log('Notifications mocked for Expo Go.');
          Alert.alert('Simulated', `Notification scheduled for ${formatTime(time)} (Requires Dev Build on Android)`);
        }
      } catch (e) {
        console.log(e);
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
        saveSettings(enabled, selectedDate);
      }
    };

    // A simple mock time picker if @react-native-community/datetimepicker is tricky
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

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
              trackColor={{ true: ac.accent }}
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
                  borderColor: ac.accent
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
        </View>
      </BottomSheet>
    );
  }
);
