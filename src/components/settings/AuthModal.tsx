import React, { useState } from 'react';
import { View, Text, Modal, KeyboardAvoidingView, Platform, Pressable, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Colors, Radius, Spacing } from '@design/tokens';
import { Text as T } from '@design/components';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@store/useAuthStore';
import { useAccentColors } from '@/hooks/use-accent-colors';

interface AuthModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
}

export function AuthModal({ visible, onSuccess, onCancel, title = 'Authentication Required' }: AuthModalProps) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [mode, setMode] = useState<'password' | 'recovery' | 'reset'>('password');
  const [recoveryAnswers, setRecoveryAnswers] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');

  const { verifyPassword, verifyRecoveryAnswers, recoveryQuestions, passwordHash, setPassword: saveNewPassword } = useAuthStore();
  const ac = useAccentColors();

  const handleVerifyPassword = () => {
    if (verifyPassword(password)) {
      setPassword('');
      onSuccess();
    } else {
      Alert.alert('Error', 'Incorrect password.');
    }
  };

  const handleVerifyRecovery = () => {
    if (verifyRecoveryAnswers(recoveryAnswers)) {
      setMode('reset');
    } else {
      Alert.alert('Error', 'One or more answers are incorrect.');
    }
  };

  const handleResetPassword = () => {
    if (!/^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*()[\]_+\-=\\{}|;':",./<>?]).{6,}$/.test(newPassword)) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters and contain letters, numbers, and special characters.');
      return;
    }
    saveNewPassword(newPassword, recoveryQuestions);
    setNewPassword('');
    setRecoveryAnswers([]);
    setMode('password');
    Alert.alert('Success', 'Password has been reset successfully.');
    onSuccess();
  };

  const handleCancel = () => {
    setPassword('');
    setNewPassword('');
    setRecoveryAnswers([]);
    setMode('password');
    onCancel();
  };

  // If no password set, instantly succeed
  React.useEffect(() => {
    if (visible && !passwordHash) {
      onSuccess();
    }
  }, [visible, passwordHash]);

  if (!passwordHash) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
          onPress={handleCancel}
        >
          <Pressable
            style={{
              backgroundColor: Colors.surface, borderRadius: Radius.lg,
              padding: Spacing[5], width: 320,
              borderWidth: 1, borderColor: Colors.border, gap: Spacing[4],
            }}
            onPress={() => {}}
          >
            <Text style={[T.h3, { textAlign: 'center' }]}>{title}</Text>
            
            {mode === 'password' ? (
              <>
                <Text style={[T.caption, { textAlign: 'center', color: Colors.textSecondary }]}>
                  Please enter your password to continue.
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border,
                  paddingHorizontal: Spacing[3], gap: Spacing[2],
                }}>
                  <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={[T.body as any, { flex: 1, color: Colors.text, paddingVertical: Spacing[3] }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password…"
                    placeholderTextColor={Colors.textDim}
                    secureTextEntry={!showPwd}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPwd((v) => !v)} hitSlop={8}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {recoveryQuestions.length > 0 && (
                  <TouchableOpacity onPress={() => setMode('recovery')}>
                    <Text style={[T.sm, { color: ac.accent, textAlign: 'center' }]}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}

                <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border }}
                  >
                    <Text style={T.sm}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleVerifyPassword}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, backgroundColor: ac.accent }}
                  >
                    <Text style={[T.sm, { color: '#fff', fontWeight: '600' }]}>Verify</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : mode === 'recovery' ? (
              <>
                <Text style={[T.caption, { textAlign: 'center', color: Colors.textSecondary }]}>
                  Answer your security questions to verify your identity.
                </Text>
                
                {recoveryQuestions.map((q, i) => (
                  <View key={i} style={{ gap: Spacing[1] }}>
                    <Text style={[T.xs, { color: Colors.text }]}>{q.question}</Text>
                    <TextInput
                      style={{
                        backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
                        borderWidth: 1, borderColor: Colors.border,
                        color: Colors.text, padding: Spacing[2]
                      }}
                      value={recoveryAnswers[i] || ''}
                      onChangeText={(val) => {
                        const newAns = [...recoveryAnswers];
                        newAns[i] = val;
                        setRecoveryAnswers(newAns);
                      }}
                      placeholder="Answer..."
                      placeholderTextColor={Colors.textDim}
                      autoCapitalize="none"
                    />
                  </View>
                ))}

                <View style={{ flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[2] }}>
                  <TouchableOpacity
                    onPress={() => setMode('password')}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border }}
                  >
                    <Text style={T.sm}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleVerifyRecovery}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, backgroundColor: ac.accent }}
                  >
                    <Text style={[T.sm, { color: '#fff', fontWeight: '600' }]}>Verify Answers</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[T.caption, { textAlign: 'center', color: Colors.textSecondary }]}>
                  Your identity has been verified. Enter a new App Password.
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
                  borderWidth: 1, borderColor: Colors.border,
                  paddingHorizontal: Spacing[3], gap: Spacing[2],
                }}>
                  <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={[T.body as any, { flex: 1, color: Colors.text, paddingVertical: Spacing[3] }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password…"
                    placeholderTextColor={Colors.textDim}
                    secureTextEntry={!showPwd}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPwd((v) => !v)} hitSlop={8}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[2] }}>
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border }}
                  >
                    <Text style={T.sm}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleResetPassword}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: Radius.md, backgroundColor: ac.accent }}
                  >
                    <Text style={[T.sm, { color: '#fff', fontWeight: '600' }]}>Reset & Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
