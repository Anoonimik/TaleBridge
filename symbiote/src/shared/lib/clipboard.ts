import { wsBridge } from '../api/websocket';

export const readClipboard = async (): Promise<string> => {
  if (navigator?.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) return text;
    } catch {
      // Fallback to obsidian bridge
    }
  }

  return new Promise((resolve) => {
    const reqId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const unsub = wsBridge.subscribe('SYSTEM_CLIPBOARD', (payload: any) => {
      if (payload?.requestId === reqId || !payload?.requestId) {
        unsub();
        resolve(payload?.text || '');
      }
    });

    wsBridge.send('GET_SYSTEM_CLIPBOARD', { requestId: reqId });
    setTimeout(() => {
      unsub();
      resolve('');
    }, 1500);
  });
};

export const writeClipboard = async (text: string): Promise<boolean> => {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
    }
  }

  wsBridge.send('SET_SYSTEM_CLIPBOARD', { text });
  return true;
};
