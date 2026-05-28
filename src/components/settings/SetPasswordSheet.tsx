import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Text as T } from '@design/components';
import { useAuthStore, type RecoveryQuestion } from '@store/useAuthStore';
import { useAccentColors } from '@/hooks/use-accent-colors';

interface SetPasswordSheetProps {
  onRemoveRequest?: () => void;
}

export const SetPasswordSheet = React.forwardRef<BottomSheetRef, SetPasswordSheetProps>((props, ref) => {
  const ac = useAccentColors();
  const { setPassword, passwordHash } = useAuthStore();
  
  const [pwd, setPwd] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [questions, setQuestions] = useState<RecoveryQuestion[]>([
    { question: '', answer: '' },
    { question: '', answer: '' },
    { question: '', answer: '' }
  ]);

  const validatePassword = (p: string) => {
    return /^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*()[\]_+\-=\\{}|;':",./<>?]).{6,}$/.test(p);
  };

  const handleSave = () => {
    if (!validatePassword(pwd)) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters and contain letters, numbers, and special characters.');
      return;
    }
    
    if (questions.some(q => !q.question.trim() || !q.answer.trim())) {
      Alert.alert('Missing Fields', 'Please fill out all 3 security questions and answers.');
      return;
    }

    setPassword(pwd, questions);
    setPwd('');
    setQuestions([
      { question: '', answer: '' },
      { question: '', answer: '' },
      { question: '', answer: '' }
    ]);
    if (typeof ref !== 'function' && ref?.current) {
      ref.current.close();
    }
    Alert.alert('Success', 'App password set successfully!');
  };

  const handleRemove = () => {
    if (typeof ref !== 'function' && ref?.current) {
      ref.current.close();
    }
    if (props.onRemoveRequest) {
      props.onRemoveRequest();
    }
  };

  return (
    <BottomSheet ref={ref} title={passwordHash ? "Manage Password" : "Set App Password"}>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing[8] }}>
        <Text style={[T.body, { color: Colors.textSecondary, marginBottom: Spacing[4] }]}>
          Secure your exports and data deletions. You must remember your password or your exact recovery answers.
        </Text>

        {passwordHash && (
          <View style={{ marginBottom: Spacing[6], padding: Spacing[4], backgroundColor: Colors.successDim, borderRadius: Radius.md }}>
            <Text style={[T.smMedium, { color: Colors.success, textAlign: 'center' }]}>You currently have a password set.</Text>
            <TouchableOpacity onPress={handleRemove} style={{ marginTop: Spacing[3], padding: Spacing[2], backgroundColor: Colors.danger, borderRadius: Radius.sm }}>
              <Text style={[T.smMedium, { color: '#fff', textAlign: 'center' }]}>Remove Password</Text>
            </TouchableOpacity>
          </View>
        )}

        {!passwordHash && (
          <>
            <View style={{ gap: Spacing[4] }}>
              <View>
                <Text style={[T.smMedium, { marginBottom: Spacing[2] }]}>New Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
                      borderWidth: 1, borderColor: Colors.border, color: Colors.text, padding: Spacing[3],
                      paddingRight: 40
                    }}
                    value={pwd}
                    onChangeText={setPwd}
                    placeholder="e.g., pass123!"
                    placeholderTextColor={Colors.textDim}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: Spacing[3] }}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={[T.xs, { color: Colors.textMuted, marginTop: Spacing[1] }]}>
                  Requires letters, digits, and special characters.
                </Text>
              </View>

              <View style={{ marginTop: Spacing[2] }}>
                <Text style={[T.smMedium, { marginBottom: Spacing[2] }]}>Recovery Questions (Create 3)</Text>
                <Text style={[T.xs, { color: Colors.textSecondary, marginBottom: Spacing[3] }]}>
                  These are used to verify you if you forget your password. Answers are case-insensitive.
                </Text>

                {questions.map((q, i) => (
                  <View key={i} style={{ marginBottom: Spacing[4], gap: Spacing[2] }}>
                    <TextInput
                      style={{
                        backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
                        borderWidth: 1, borderColor: Colors.border, color: Colors.text, padding: Spacing[2]
                      }}
                      value={q.question}
                      onChangeText={(val) => {
                        const newQ = [...questions];
                        newQ[i].question = val;
                        setQuestions(newQ);
                      }}
                      placeholder={`Question ${i + 1} (e.g. Childhood friend's name)`}
                      placeholderTextColor={Colors.textDim}
                    />
                    <TextInput
                      style={{
                        backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
                        borderWidth: 1, borderColor: Colors.border, color: Colors.text, padding: Spacing[2]
                      }}
                      value={q.answer}
                      onChangeText={(val) => {
                        const newQ = [...questions];
                        newQ[i].answer = val;
                        setQuestions(newQ);
                      }}
                      placeholder={`Answer ${i + 1}`}
                      placeholderTextColor={Colors.textDim}
                      autoCapitalize="none"
                    />
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleSave}
              style={{ backgroundColor: ac.accent, padding: Spacing[3], borderRadius: Radius.md, marginTop: Spacing[4] }}
            >
              <Text style={[T.smMedium, { color: '#fff', textAlign: 'center' }]}>Save Password</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
});
