import { create } from 'zustand';

export interface LogEntry {
  id: string;
  text: string;
  type: 'sys' | 'roll' | 'chat' | 'error';
  time: string;
}

interface LogStoreState {
  logs: LogEntry[];
  addLog: (text: string, type?: LogEntry['type']) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogStoreState>((set) => ({
  logs: [],
  addLog: (text, type = 'sys') => set((state) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      text,
      type,
      time,
    };
    return { logs: [entry, ...state.logs].slice(0, 100) };
  }),
  clearLogs: () => set({ logs: [] }),
}));
