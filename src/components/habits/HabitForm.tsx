import { Buttons, Cards, Inputs, Text as T } from '@design/components';
import { Colors, Spacing } from '@design/tokens';
import { Ionicons } from '@expo/vector-icons';
import { createHabit, updateHabit } from '@services/habitService';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import type { CompositeStep, FrequencyRule, Habit, HabitType } from '@src/types';
import { generateId } from '@src/utils/idUtils';
import { useHabitStore } from '@store/useHabitStore';
import { useAccentColors } from '@/hooks/use-accent-colors';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';


// ── Type option ───────────────────────────────────────────────────────────────
const TYPES: { value: HabitType; label: string; icon: string; hint: string }[] = [
  { value: 'boolean', label: 'Done/Not Done', icon: 'checkmark-circle-outline', hint: 'Simple yes/no completion' },
  { value: 'quantity', label: 'Measurable', icon: 'bar-chart-outline', hint: 'Track a quantity with a target' },
  { value: 'duration', label: 'Duration', icon: 'timer-outline', hint: 'Track time spent on a habit' },
  { value: 'composite', label: 'Checklist', icon: 'list-outline', hint: 'Multiple steps to complete' },
  { value: 'counter', label: 'Counter', icon: 'add-circle-outline', hint: 'Count anything — no target needed' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FormState {
  name: string;
  description: string;
  type: HabitType;
  targetValue: string;
  unit: string;
  frequencyType: 'daily' | 'weekly';
  selectedDays: number[];
  compositeSteps: CompositeStep[];
  categoryId: string | null;
}

function defaultForm(): FormState {
  return {
    name: '',
    description: '',
    type: 'boolean',
    targetValue: '1',
    unit: '',
    frequencyType: 'daily',
    selectedDays: [1, 2, 3, 4, 5],
    compositeSteps: [],
    categoryId: null,
  };
}

function habitToForm(habit: Habit): FormState {
  return {
    name: habit.name,
    description: habit.description,
    type: habit.type,
    targetValue: String(habit.targetValue),
    unit: habit.unit,
    frequencyType: habit.frequencyRules.type === 'daily' ? 'daily' : 'weekly',
    selectedDays: habit.frequencyRules.daysOfWeek ?? [1, 2, 3, 4, 5],
    compositeSteps: habit.compositeSteps,
    categoryId: habit.categoryId,
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface HabitFormRef {
  openCreate: (initialDate?: string) => void;
  openEdit: (habit: Habit) => void;
}

interface HabitFormProps {
  onSaved?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const HabitForm = React.forwardRef<HabitFormRef, HabitFormProps>(
  ({ onSaved }, ref) => {
    const sheetRef = useRef<BottomSheetRef>(null);
    const [form, setForm] = useState<FormState>(defaultForm());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [createDate, setCreateDate] = useState<string | null>(null);
    const [newStepText, setNewStepText] = useState('');
    const [saving, setSaving] = useState(false);

    const loadHabits = useHabitStore((s) => s.loadHabits);
    const categories = useHabitStore((s) => s.categories);
    const ac = useAccentColors();

    React.useImperativeHandle(ref, () => ({
      openCreate: (initialDate?: string) => {
        setForm(defaultForm());
        setEditingId(null);
        setCreateDate(initialDate ?? null);
        sheetRef.current?.open();
      },
      openEdit: (habit: Habit) => {
        setForm(habitToForm(habit));
        setEditingId(habit.id);
        sheetRef.current?.open();
      },
    }));

    const update = (patch: Partial<FormState>) =>
      setForm((prev) => ({ ...prev, ...patch }));

    const toggleDay = (day: number) => {
      const days = form.selectedDays.includes(day)
        ? form.selectedDays.filter((d) => d !== day)
        : [...form.selectedDays, day];
      update({ selectedDays: days });
    };

    const addStep = () => {
      const text = newStepText.trim();
      if (!text) return;
      const step: CompositeStep = {
        id: generateId(),
        title: text,
        order: form.compositeSteps.length,
      };
      update({ compositeSteps: [...form.compositeSteps, step] });
      setNewStepText('');
    };

    const removeStep = (id: string) =>
      update({ compositeSteps: form.compositeSteps.filter((s) => s.id !== id) });

    const handleSave = async () => {
      if (!form.name.trim()) {
        Alert.alert('Name required', 'Please enter a name for this habit.');
        return;
      }
      setSaving(true);
      try {
        const frequencyRules: FrequencyRule =
          form.frequencyType === 'daily'
            ? { type: 'daily' }
            : { type: 'weekly', daysOfWeek: form.selectedDays };

        // Color is derived from the selected category; fallback to the user's accent color
        const categoryColor = form.categoryId
          ? (categories.find((c) => c.id === form.categoryId)?.color ?? ac.accent)
          : ac.accent;

        const payload: any = {
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          targetValue: parseFloat(form.targetValue) || 1,
          unit: form.unit.trim(),
          color: categoryColor,
          frequencyRules,
          compositeSteps: form.compositeSteps,
          categoryId: form.categoryId,
        };

        if (editingId) {
          await updateHabit(editingId, payload);
        } else {
          if (createDate) {
            // Keep current time but change the date
            const now = new Date();
            const [y, m, d] = createDate.split('-');
            now.setFullYear(parseInt(y), parseInt(m) - 1, parseInt(d));
            payload.createdAt = now.toISOString();
          }
          await createHabit(payload);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadHabits();
        sheetRef.current?.close();
        onSaved?.();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setSaving(false);
      }
    };

    return (
      <BottomSheet
        ref={sheetRef}
        title={editingId ? 'Edit Habit' : 'New Habit'}
      >
        <View style={{ gap: Spacing[4], paddingBottom: Spacing[8] }}>

          {/* Name */}
          <View>
            <Text style={[T.label, { marginBottom: Spacing[2] }]}>Name</Text>
            <TextInput
              style={Inputs.base}
              value={form.name}
              onChangeText={(name) => update({ name })}
              placeholder="e.g. Morning Run"
              placeholderTextColor={Colors.textDim}
              autoFocus
              returnKeyType="next"
            />
          </View>

          {/* Description */}
          <View>
            <Text style={[T.label, { marginBottom: Spacing[2] }]}>Description (optional)</Text>
            <TextInput
              style={Inputs.base}
              value={form.description}
              onChangeText={(description) => update({ description })}
              placeholder="What's this habit about?"
              placeholderTextColor={Colors.textDim}
            />
          </View>

          {/* Type selector */}
          <View>
            <Text style={[T.label, { marginBottom: Spacing[2] }]}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] }}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => update({ type: t.value })}
                  style={[Cards.compact, {
                    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
                    borderColor: form.type === t.value ? ac.accent : Colors.border,
                    backgroundColor: form.type === t.value ? ac.accentMuted : Colors.surface,
                    paddingVertical: Spacing[2], paddingHorizontal: Spacing[3],
                  }]}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={16}
                    color={form.type === t.value ? ac.accentGlow : Colors.textMuted}
                  />
                  <Text style={[T.sm, { color: form.type === t.value ? ac.accentGlow : Colors.textSecondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Hint for selected type */}
            <Text style={[T.caption, { marginTop: Spacing[1], color: Colors.textDim }]}>
              {TYPES.find((t) => t.value === form.type)?.hint ?? ''}
            </Text>
          </View>

          {/* Target value + unit (quantity / duration only — counter has no target) */}
          {(form.type === 'quantity' || form.type === 'duration') && (
            <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Text style={[T.label, { marginBottom: Spacing[2] }]}>
                  {form.type === 'duration' ? 'Target (minutes)' : 'Target amount'}
                </Text>
                <TextInput
                  style={Inputs.base}
                  value={form.targetValue}
                  onChangeText={(targetValue) => update({ targetValue })}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={Colors.textDim}
                />
              </View>
              {form.type === 'quantity' && (
                <View style={{ flex: 1 }}>
                  <Text style={[T.label, { marginBottom: Spacing[2] }]}>Unit</Text>
                  <TextInput
                    style={Inputs.base}
                    value={form.unit}
                    onChangeText={(unit) => update({ unit })}
                    placeholder="ml, pages, km…"
                    placeholderTextColor={Colors.textDim}
                  />
                </View>
              )}
            </View>
          )}

          {/* Composite steps */}
          {form.type === 'composite' && (
            <View>
              <Text style={[T.label, { marginBottom: Spacing[2] }]}>Checklist Steps</Text>
              {form.compositeSteps.map((step) => (
                <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: Spacing[2] }}>
                  <View style={{ flex: 1, ...Cards.compact as any, paddingVertical: Spacing[2] }}>
                    <Text style={T.sm}>{step.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeStep(step.id)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
                <TextInput
                  style={[Inputs.base, { flex: 1 }]}
                  value={newStepText}
                  onChangeText={setNewStepText}
                  placeholder="Add step…"
                  placeholderTextColor={Colors.textDim}
                  onSubmitEditing={addStep}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={addStep} style={[Buttons.icon, { backgroundColor: ac.accentMuted, borderColor: ac.accentDim }]}>
                  <Ionicons name="add" size={20} color={ac.accentGlow} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Frequency */}
          <View>
            <Text style={[T.label, { marginBottom: Spacing[2] }]}>Frequency</Text>
            <View style={{ flexDirection: 'row', gap: Spacing[2], marginBottom: Spacing[3] }}>
              {(['daily', 'weekly'] as const).map((ft) => (
                <TouchableOpacity
                  key={ft}
                  onPress={() => update({ frequencyType: ft })}
                  style={[Cards.compact, {
                    flex: 1, alignItems: 'center',
                    borderColor: form.frequencyType === ft ? ac.accent : Colors.border,
                    backgroundColor: form.frequencyType === ft ? ac.accentMuted : Colors.surface,
                  }]}
                >
                  <Text style={[T.sm, { color: form.frequencyType === ft ? ac.accentGlow : Colors.textSecondary, textTransform: 'capitalize' }]}>
                    {ft}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.frequencyType === 'weekly' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {DAYS.map((d, i) => {
                  const active = form.selectedDays.includes(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => toggleDay(i)}
                      style={{
                        width: 38, height: 38, borderRadius: 19,
                        backgroundColor: active ? ac.accent : Colors.surfaceElevated,
                        borderWidth: 1, borderColor: active ? ac.accent : Colors.border,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={[T.xs, { color: active ? '#fff' : Colors.textMuted }]}>{d[0]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>


          {/* Category assignment */}
          {categories.length > 0 && (
            <View>
              <Text style={[T.label, { marginBottom: Spacing[2] }]}>Category (optional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] }}>
                <TouchableOpacity
                  onPress={() => update({ categoryId: null })}
                  style={[Cards.compact, {
                    borderColor: form.categoryId === null ? ac.accent : Colors.border,
                    backgroundColor: form.categoryId === null ? ac.accentMuted : Colors.surface,
                  }]}
                >
                  <Text style={[T.sm, { color: form.categoryId === null ? ac.accentGlow : Colors.textMuted }]}>None</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => update({ categoryId: c.id })}
                    style={[Cards.compact, {
                      borderColor: form.categoryId === c.id ? ac.accent : Colors.border,
                      backgroundColor: form.categoryId === c.id ? ac.accentMuted : Colors.surface,
                    }]}
                  >
                    <Text style={[T.sm, { color: form.categoryId === c.id ? ac.accentGlow : Colors.textSecondary }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[
              Buttons.primary,
              { 
                opacity: saving ? 0.6 : 1, 
                backgroundColor: ac.accent,
                shadowColor: 'transparent',
                shadowOpacity: 0,
                elevation: 0,
              }
            ]}
          >
            <Ionicons name={editingId ? 'save-outline' : 'add-circle-outline'} size={18} color="#fff" />
            <Text style={[T.bodyMedium, { color: '#fff' }]}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Habit'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  },
);
