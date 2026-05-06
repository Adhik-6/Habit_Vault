import { useHabitStore } from '@store/useHabitStore';
import { useSettingsStore } from '@store/useSettingsStore';

export function useHabitColor(categoryId: string | null): string {
  const categories = useHabitStore((s) => s.categories);
  const accentColor = useSettingsStore((s) => s.accentColor);

  if (categoryId) {
    const category = categories.find((c) => c.id === categoryId);
    if (category?.color) {
      return category.color;
    }
  }
  return accentColor;
}

export function useCategoryColor(categoryId: string | null): string {
  return useHabitColor(categoryId);
}
