import React, { useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import {
  Modal, View, Text, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors, Spacing } from '@design/tokens';
import { Sheet, Text as T } from '@design/components';

const DRAG_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 800;

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
}

interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
}

const BottomSheetComponent = (
  { children, title, onClose }: BottomSheetProps,
  ref: React.Ref<BottomSheetRef>,
) => {
  const [visible, setVisible] = useState(false);
  const translateY = useSharedValue(700);
  const backdropOpacity = useSharedValue(0);

  const closeSheet = useCallback(() => {
    translateY.value = withTiming(700, { duration: 250 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, (done) => {
      if (done) runOnJS(setVisible)(false);
    });
    onClose?.();
  }, [onClose]);

  const openSheet = useCallback(() => {
    setVisible(true);
    translateY.value = withTiming(0, { duration: 250 });
    backdropOpacity.value = withTiming(1, { duration: 250 });
  }, []);

  useImperativeHandle(ref, () => ({ open: openSheet, close: closeSheet }));

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > DRAG_THRESHOLD || e.velocityY > VELOCITY_THRESHOLD) {
        runOnJS(closeSheet)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSheet}>
      <TouchableWithoutFeedback onPress={closeSheet}>
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)' },
            backdropStyle,
          ]}
        />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <GestureDetector gesture={pan}>
          <Animated.View style={[Sheet.container, { maxHeight: '90%' }, sheetStyle]}>
            <View style={Sheet.handle} />
            {title && (
              <Text style={[T.h3, { marginBottom: Spacing[4] }]}>{title}</Text>
            )}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const BottomSheet = forwardRef(BottomSheetComponent);
