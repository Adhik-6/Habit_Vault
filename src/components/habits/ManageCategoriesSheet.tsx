import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, type BottomSheetRef } from '@src/components/common/BottomSheet';
import { useHabitStore } from '@store/useHabitStore';
import { createCategory, updateCategory, deleteCategory } from '@services/categoryService';
import { Colors, Spacing, Radius } from '@design/tokens';
import { Cards, Inputs, Buttons, Text as T } from '@design/components';

export const ManageCategoriesSheet = React.forwardRef<BottomSheetRef, {}>((props, ref) => {
  const categories = useHabitStore((s) => s.categories);
  const loadHabits = useHabitStore((s) => s.loadHabits);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');

  const resetForm = () => {
    setIsCreating(false);
    setEditId(null);
    setName('');
    setColor('#6366F1');
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter a category name');
    
    try {
      if (editId) {
        await updateCategory(editId, { name, color });
      } else {
        await createCategory({ name, color });
      }
      await loadHabits();
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (id: string, catName: string) => {
    Alert.alert('Delete Category', `Are you sure you want to delete "${catName}"? Habits in this category will become uncategorized.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteCategory(id);
        await loadHabits();
      }}
    ]);
  };

  return (
    <BottomSheet ref={ref} title="Manage Categories" onClose={resetForm}>
      <View style={{ paddingBottom: Spacing[8] }}>
        
        {/* List of categories */}
        {!isCreating && !editId && (
          <View style={{ gap: Spacing[3], marginBottom: Spacing[5] }}>
            {categories.map(c => (
              <View key={c.id} style={[Cards.compact, { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }]}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.color }} />
                <Text style={[T.bodyMedium, { flex: 1 }]}>{c.name}</Text>
                
                <TouchableOpacity onPress={() => { setEditId(c.id); setName(c.name); setColor(c.color); }}>
                  <Ionicons name="pencil" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(c.id, c.name)}>
                  <Ionicons name="trash" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {categories.length === 0 && (
              <Text style={[T.body, { color: Colors.textMuted, textAlign: 'center', marginVertical: Spacing[4] }]}>
                No categories yet.
              </Text>
            )}

            <TouchableOpacity 
              style={[Buttons.primary, { marginTop: Spacing[2] }]} 
              onPress={() => setIsCreating(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={[T.bodyMedium, { color: '#fff' }]}>Create Category</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Form */}
        {(isCreating || editId) && (
          <View style={{ gap: Spacing[4] }}>
            <View>
              <Text style={[T.label, { marginBottom: Spacing[2] }]}>Category Name</Text>
              <TextInput
                style={Inputs.base}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Health"
                placeholderTextColor={Colors.textDim}
                autoFocus
              />
            </View>

            <View>
              <Text style={[T.label, { marginBottom: Spacing[2] }]}>Colour</Text>
              <View style={{ flexDirection: 'row', gap: Spacing[3], flexWrap: 'wrap' }}>
                {['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#38BDF8', '#A855F7', '#EF4444', '#84CC16'].map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={{
                      width: 32, height: 32, borderRadius: 16, backgroundColor: c,
                      borderWidth: color === c ? 3 : 0, borderColor: '#fff'
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[2] }}>
              <TouchableOpacity style={[Buttons.secondary, { flex: 1 }]} onPress={resetForm}>
                <Text style={[T.bodyMedium, { color: Colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[Buttons.primary, { flex: 1 }]} onPress={handleSave}>
                <Text style={[T.bodyMedium, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
});
