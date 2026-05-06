import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { Colors, Spacing } from '@design/tokens';
import { Text as T } from '@design/components';
import { useSettingsStore } from '@store/useSettingsStore';

export const AccentColorSheet = React.forwardRef<BottomSheetRef, {}>((props, ref) => {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);

  return (
    <BottomSheet ref={ref} title="Accent Color">
      <View style={{ paddingBottom: Spacing[8] }}>
        <Text style={[T.body, { color: Colors.textSecondary, marginBottom: Spacing[4] }]}>
          Choose the default color for your uncategorized habits.
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing[3], flexWrap: 'wrap' }}>
          {['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#38BDF8', '#A855F7', '#EF4444', '#84CC16'].map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setAccentColor(c)}
              style={{
                width: 48, height: 48, borderRadius: 24, backgroundColor: c,
                borderWidth: accentColor === c ? 3 : 0, borderColor: '#fff'
              }}
            />
          ))}
        </View>
      </View>
    </BottomSheet>
  );
});
