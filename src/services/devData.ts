import { getDb } from '@src/db/database';
import { generateId } from '@src/utils/idUtils';
import { toDateString } from '@src/utils/dateUtils';
import { useHabitStore } from '@src/store/useHabitStore';
import { useAnalyticsStore } from '@src/store/useAnalyticsStore';
import { useMoodStore } from '@src/store/useMoodStore';

import { BAD_HABITS_CATEGORY_ID } from '@src/db/schema';

export async function clearAllData() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM mood_logs;
    DELETE FROM categories WHERE id != '${BAD_HABITS_CATEGORY_ID}';
    DELETE FROM habit_logs;
    DELETE FROM habits;
  `);
  await useHabitStore.getState().loadHabits();
  await useMoodStore.getState().loadMoodLogs();
  await useAnalyticsStore.getState().recomputeAll();
}

export async function generateSampleData() {
  const db = await getDb();
  
  // Clear first
  await clearAllData();

  const categories = useHabitStore.getState().categories;
  const getRandomCategory = () => {
    if (categories.length === 0) return null;
    const idx = Math.floor(Math.random() * categories.length);
    // don't pick the bad habit system category explicitly
    return categories[idx].id === BAD_HABITS_CATEGORY_ID ? null : categories[idx].id;
  };

  const today = new Date();

  // Create 5 Normal Habits
  const normalHabits = [
    { name: 'Morning Jog', type: 'boolean', isBad: false, targetValue: 1, unit: '' },
    { name: 'Read 20 pages', type: 'quantity', isBad: false, targetValue: 20, unit: 'pages' },
    { name: 'Meditate', type: 'duration', isBad: false, targetValue: 10, unit: 'min' },
    { name: 'Morning Routine', type: 'composite', isBad: false, targetValue: 1, unit: '', steps: ['Make bed', 'Brush teeth', 'Drink water'] },
    { name: 'Drink 2L Water', type: 'quantity', isBad: false, targetValue: 2000, unit: 'ml' }
  ];

  // Create 5 Bad Habits
  const badHabits = [
    { name: 'Eat Junk Food', type: 'boolean', isBad: true, targetValue: 1, unit: '' },
    { name: 'Smoking', type: 'quantity', isBad: true, targetValue: 5, unit: 'cigs' },
    { name: 'Binge Watching TV', type: 'duration', isBad: true, targetValue: 120, unit: 'min' },
    { name: 'Nail Biting', type: 'boolean', isBad: true, targetValue: 1, unit: '' },
    { name: 'Late Night Snacking', type: 'boolean', isBad: true, targetValue: 1, unit: '' }
  ];

  const habitsToInsert = [];
  const logsToInsert = [];

  const allDefinitions: any[] = [...normalHabits, ...badHabits];

  for (const def of allDefinitions) {
    const habitId = generateId();
    const catId = getRandomCategory();
    
    habitsToInsert.push({
      id: habitId,
      name: def.name,
      description: 'Sample description',
      type: def.type,
      targetValue: def.targetValue,
      unit: def.unit,
      frequencyRules: JSON.stringify({ type: 'daily' }),
      categoryId: def.isBad ? BAD_HABITS_CATEGORY_ID : catId,
      color: '#A855F7',
      createdAt: new Date().toISOString(),
      compositeSteps: def.steps ? JSON.stringify(def.steps.map((s: any, i: any) => ({ id: generateId(), title: s, order: i }))) : '[]',
      isBadHabit: def.isBad ? 1 : 0
    });

    // Generate 50 days of logs
    for (let i = 50; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = toDateString(d);

      // Random logic
      // Normal habit: ~70% chance of completion
      // Bad habit: ~40% chance of failing (doing it)
      let didComplete = def.isBad ? Math.random() < 0.4 : Math.random() < 0.7;
      
      let value = 0;
      let completedAt = null;
      let compositeProgress = {};
      let durationSeconds = 0;

      if (didComplete) {
        completedAt = d.toISOString();
        if (def.type === 'quantity') value = def.targetValue + Math.floor(Math.random() * 5);
        else if (def.type === 'duration') {
          value = def.targetValue * 60;
          durationSeconds = value;
        }
        else value = 1;

        if (def.steps) {
          def.steps.forEach((_: any, stepIdx: any) => {
             // mark all steps true
             // (simplified)
          });
        }
      } else {
        if (def.type === 'quantity') value = Math.floor(def.targetValue * Math.random());
      }

      logsToInsert.push({
        id: generateId(),
        habitId,
        date: dateStr,
        value,
        completedAt,
        durationSeconds,
        notes: '',
        moodRating: null,
        failureReason: null,
        failureCustomText: '',
        compositeProgress: JSON.stringify(compositeProgress)
      });
    }
  }

  // Insert Habits
  for (const h of habitsToInsert) {
    await db.runAsync(
      `INSERT INTO habits (id, name, description, type, targetValue, unit, frequencyRules, categoryId, color, createdAt, compositeSteps, isBadHabit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
       [h.id, h.name, h.description, h.type, h.targetValue, h.unit, h.frequencyRules, h.categoryId, h.color, h.createdAt, h.compositeSteps, h.isBadHabit]
    );
  }

  // Insert Logs
  for (const l of logsToInsert) {
    await db.runAsync(
      `INSERT INTO habit_logs (id, habitId, date, value, completedAt, durationSeconds, notes, moodRating, failureReason, failureCustomText, compositeProgress)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
       [l.id, l.habitId, l.date, l.value, l.completedAt, l.durationSeconds, l.notes, l.moodRating, l.failureReason, l.failureCustomText, l.compositeProgress]
    );
  }

  await useHabitStore.getState().loadHabits();
}
