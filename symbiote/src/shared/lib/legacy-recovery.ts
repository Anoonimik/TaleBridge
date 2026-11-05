import { stateSchema } from '../../../../packages/protocol';
export function legacyCharacterState(name: string): Record<string, unknown> | null {
  try {
    const backup = JSON.parse(localStorage.getItem('tb_legacy_backup_v1') || '{}') as Record<
      string,
      string
    >;
    const player = JSON.parse(backup.tb_player_data || 'null');
    const meta = JSON.parse(backup[`tb_char_meta_${name.toLowerCase().trim()}`] || 'null');
    const result = stateSchema.safeParse({ ...meta, ...(player?.name === name ? player : {}) });
    return result.success && Object.keys(result.data).length > 0 ? result.data : null;
  } catch {
    return null;
  }
}
export function exportRecoveryData() {
  const data: Record<string, string> = {};
  for (const storage of [localStorage, sessionStorage])
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && /^(?:tb_v2:|tb_legacy_backup_v1$|tb_outbox_v1:|tb_conflicts_v1:)/.test(key)) {
        const value = storage.getItem(key);
        if (value !== null) data[key] = value;
      }
    }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'talebridge-recovery.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
