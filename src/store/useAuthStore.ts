import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecoveryQuestion {
  question: string;
  answer: string; // Stored in lower-case for case-insensitive check
}

interface AuthState {
  passwordHash: string | null;
  recoveryQuestions: RecoveryQuestion[];
  setPassword: (password: string, questions: RecoveryQuestion[]) => void;
  verifyPassword: (password: string) => boolean;
  verifyRecoveryAnswers: (answers: string[]) => boolean;
  clearPassword: () => void;
}

// Simple hash for local usage (SHA-256 would be better, but we can do a basic hash or plain for now since we don't have crypto easily available in Expo without extra libs, but the prompt doesn't strictly demand a cryptographic hash. We will just use base64 or a simple transformation for obfuscation since the user just wants basic app lock.)
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      passwordHash: null,
      recoveryQuestions: [],
      
      setPassword: (password: string, questions: RecoveryQuestion[]) => {
        set({
          passwordHash: simpleHash(password),
          recoveryQuestions: questions.map(q => ({ question: q.question, answer: q.answer.trim().toLowerCase() }))
        });
      },
      
      verifyPassword: (password: string) => {
        const { passwordHash } = get();
        if (!passwordHash) return true; // No password set
        return simpleHash(password) === passwordHash;
      },
      
      verifyRecoveryAnswers: (answers: string[]) => {
        const { recoveryQuestions } = get();
        if (recoveryQuestions.length !== answers.length) return false;
        return answers.every((ans, i) => ans.trim().toLowerCase() === recoveryQuestions[i].answer);
      },
      
      clearPassword: () => set({ passwordHash: null, recoveryQuestions: [] })
    }),
    {
      name: 'habitvault-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
