import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHabitStore } from '@store/useHabitStore';
import { useAnalyticsStore } from '@store/useAnalyticsStore';
import { useStreakTargetStore } from '@store/useStreakTargetStore';
import { Text as T, Buttons, Inputs, Sheet } from '@design/components';
import { Colors, Spacing, Radius } from '@design/tokens';
import { useAccentColors } from '@/hooks/use-accent-colors';
import { Ionicons } from '@expo/vector-icons';

export function AddStreakTargetSheet({ onClose, editingTargetId }: { onClose: () => void; editingTargetId?: string }) {
  const allHabits = useHabitStore(s => s.habits);
  const categories = useHabitStore(s => s.categories);
  const strengthScores = useAnalyticsStore(s => s.strengthScores);
  const habits = useMemo(() => allHabits.filter(h => !h.archivedAt), [allHabits]);
  const { targets, addTarget, editTarget, removeTarget } = useStreakTargetStore();
  const ac = useAccentColors();

  const editingTarget = useMemo(() => targets.find(t => t.id === editingTargetId), [targets, editingTargetId]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | undefined>(undefined);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [targetDays, setTargetDays] = useState<string>('');
  const [label, setLabel] = useState<string>('');

  useEffect(() => {
    if (editingTarget) {
      const habit = habits.find(h => h.id === editingTarget.habitId);
      if (habit) {
        setSelectedCategoryId(habit.categoryId);
        setSelectedHabitId(habit.id);
      }
      setTargetDays(editingTarget.targetDays.toString());
      setLabel(editingTarget.label || '');
    }
  }, [editingTarget, habits]);

  const categoriesWithHabits = useMemo(() => {
    const cats: { id: string | null, name: string, color: string }[] = [];
    
    for (const cat of categories) {
      if (habits.some(h => h.categoryId === cat.id)) {
        cats.push({ id: cat.id, name: cat.name, color: cat.color });
      }
    }
    
    if (habits.some(h => h.categoryId === null)) {
      cats.push({ id: null, name: 'Other', color: ac.accent });
    }
    
    return cats;
  }, [categories, habits, ac.accent]);

  useEffect(() => {
    if (!editingTarget && categoriesWithHabits.length > 0 && selectedCategoryId === undefined) {
      setSelectedCategoryId(categoriesWithHabits[0].id);
    }
  }, [categoriesWithHabits, selectedCategoryId, editingTarget]);

  const filteredHabits = useMemo(() => {
    return habits.filter(h => h.categoryId === selectedCategoryId);
  }, [habits, selectedCategoryId]);

  useEffect(() => {
    if (selectedHabitId && !editingTarget) {
      const isValid = filteredHabits.some(h => h.id === selectedHabitId);
      if (!isValid) setSelectedHabitId(null);
    }
  }, [filteredHabits, selectedHabitId, editingTarget]);

  const handleSave = async () => {
    const days = parseInt(targetDays, 10);
    if (!selectedHabitId || isNaN(days) || days <= 0) return;

    if (editingTargetId) {
      await editTarget(editingTargetId, {
        habitId: selectedHabitId,
        label: label.trim() || null,
        targetDays: days,
      });
    } else {
      await addTarget({
        habitId: selectedHabitId,
        label: label.trim() || null,
        targetDays: days,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!editingTargetId) return;
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await removeTarget(editingTargetId);
            onClose();
          } 
        }
      ]
    );
  };

  const isValid = selectedHabitId && parseInt(targetDays, 10) > 0;
  const isBadCategory = selectedCategoryId === '__bad_habits__';
  const categoryColor = categoriesWithHabits.find(c => c.id === selectedCategoryId)?.color || ac.accent;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={Sheet.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ justifyContent: 'flex-end' }}
        >
        <View style={[Sheet.container, { maxHeight: '90%' }]}>
          <View style={Sheet.handle} />
          
          <Text style={[T.h2, { marginBottom: Spacing[4] }]}>
            {editingTargetId ? 'Edit Goal' : 'New Goal'}
          </Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {categoriesWithHabits.length > 0 && (
              <>
                <Text style={[T.label, { marginBottom: Spacing[2] }]}>Select Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing[4] }}>
                  <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
                    {categoriesWithHabits.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      const isBad = cat.id === '__bad_habits__';
                      
                      const inner = (
                        <View style={{
                          paddingVertical: Spacing[2],
                          paddingHorizontal: Spacing[3],
                          borderRadius: Radius.full,
                          backgroundColor: isSelected ? (isBad ? 'transparent' : cat.color) : Colors.surface,
                          borderWidth: 1,
                          borderColor: isSelected ? (isBad ? 'transparent' : cat.color) : Colors.border,
                        }}>
                          <Text style={[T.smMedium, { color: isSelected ? '#FFF' : Colors.textSecondary }]}>
                            {cat.name}
                          </Text>
                        </View>
                      );
                      
                      return (
                        <TouchableOpacity key={cat.id || 'uncategorized'} onPress={() => setSelectedCategoryId(cat.id)}>
                          {isSelected && isBad ? (
                            <LinearGradient
                              colors={['#1A1A1A', Colors.danger]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{ borderRadius: Radius.full }}
                            >
                              {inner}
                            </LinearGradient>
                          ) : (
                            inner
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            <Text style={[T.label, { marginBottom: Spacing[2] }]}>Select Habit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing[4] }}>
              <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
                {filteredHabits.length === 0 ? (
                  <Text style={[T.bodyMedium, { color: Colors.textMuted }]}>No habits found</Text>
                ) : (
                  filteredHabits.map((habit) => {
                    const isSelected = selectedHabitId === habit.id;
                    const score = strengthScores.find(s => s.habitId === habit.id);
                    const hasStreak = score && score.streak.current > 0;
                    const icon = habit.isBadHabit ? '🛡️' : '🔥';
                    
                    const inner = (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing[2],
                        paddingVertical: Spacing[2],
                        paddingHorizontal: Spacing[3],
                        borderRadius: Radius.full,
                        backgroundColor: isSelected ? (habit.isBadHabit ? 'transparent' : categoryColor) : Colors.surface,
                        borderWidth: 1,
                        borderColor: isSelected ? (habit.isBadHabit ? 'transparent' : categoryColor) : Colors.border,
                      }}>
                        {hasStreak && <Text style={{ fontSize: 14 }}>{icon}</Text>}
                        <Text style={[T.smMedium, { color: isSelected ? '#FFF' : Colors.textSecondary }]}>
                          {habit.name}
                        </Text>
                      </View>
                    );
                    
                    return (
                      <TouchableOpacity key={habit.id} onPress={() => setSelectedHabitId(habit.id)}>
                        {isSelected && habit.isBadHabit ? (
                          <LinearGradient
                            colors={['#1A1A1A', Colors.danger]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ borderRadius: Radius.full }}
                          >
                            {inner}
                          </LinearGradient>
                        ) : (
                          inner
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </ScrollView>

            <Text style={[T.label, { marginBottom: Spacing[2] }]}>Target Days (Streak)</Text>
            <TextInput
              style={[Inputs.base, { marginBottom: Spacing[4], fontSize: 18 }]}
              placeholder="e.g., 30"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={targetDays}
              onChangeText={setTargetDays}
              maxLength={4}
            />

            <Text style={[T.label, { marginBottom: Spacing[2] }]}>Goal Name (Optional)</Text>
            <TextInput
              style={[Inputs.base, { marginBottom: Spacing[6] }]}
              placeholder="e.g., 30 Days Sugar-Free"
              placeholderTextColor={Colors.textMuted}
              value={label}
              onChangeText={setLabel}
              maxLength={50}
            />

            <View style={{ flexDirection: 'row', gap: Spacing[3], paddingBottom: Spacing[8] }}>
              {editingTargetId && (
                <TouchableOpacity 
                  style={[Buttons.secondary, { backgroundColor: Colors.danger + '1A', borderColor: Colors.danger + '33' }]} 
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={[Buttons.secondary, { flex: 1 }]} onPress={onClose}>
                <Text style={T.bodyMedium}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ flex: 2, borderRadius: Radius.md, overflow: 'hidden', opacity: isValid ? 1 : 0.5 }}
                onPress={handleSave}
                disabled={!isValid}
              >
                {isBadCategory && isValid ? (
                  <LinearGradient
                    colors={['#1A1A1A', Colors.danger]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={[T.bodyMedium, { color: '#FFF' }]}>Save Goal</Text>
                  </LinearGradient>
                ) : (
                  <View style={{ flex: 1, backgroundColor: isValid ? categoryColor : Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[T.bodyMedium, { color: isValid ? '#FFF' : Colors.textMuted }]}>Save Goal</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
