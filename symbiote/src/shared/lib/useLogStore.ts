import { create } from 'zustand';

export interface LogEntry {
  id: string;
  time: string;
  type: 'roll' | 'combat' | 'sync' | 'note';
  message: string;
}

interface LogStore {
  logs: LogEntry[];
  addLog: (type: LogEntry['type'], message: string) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  addLog: (type, message) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time,
      type,
      message,
    };
    set((state) => ({ logs: [newEntry, ...state.logs.slice(0, 49)] }));
  },
  clearLogs: () => set({ logs: [] }),
}));
