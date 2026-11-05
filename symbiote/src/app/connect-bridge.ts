import { configureClueStorage, readPersonalClues } from '../shared/lib/personal-clues';
import { wsBridge } from '../shared/api/websocket';
import { taleSpireDriver } from '../shared/api/talespire';
import { useAppStore, type VaultImage, type CinemaMediaPayload } from '../shared/lib/useAppStore';
import { useRosterStore } from '../shared/lib/useRosterStore';
import { useCombatStore } from '../shared/lib/useCombatStore';
import { useStoryStore } from '../shared/lib/useStoryStore';
import { useLogStore } from '../shared/lib/useLogStore';
import { configureCharacterStorage, getStoredArray } from '../shared/lib/character-storage';
import { setMediaLinks, rememberPublishedMedia } from '../shared/lib/media';
import { STORAGE_KEYS } from '../shared/config/constants';
import { stateSchema, mediaSchema, combatSchema } from '../../../packages/protocol';
import type { Character, Scene, Bookmark, CombatState } from '../shared/types';

const metadataKeys = [
  'currency',
  'activeConcentration',
  'concentrationChecks',
  'skills',
  'temp_hp',
  'inspiration',
  'deathSaves',
  'hitDice',
  'spellcastingAbility',
  'spellSlots',
  'spells',
  'resources',
  'savingThrowsProficient',
] as const;
export function connectBridge() {
  let applying = false;
  let ownedId: string | undefined;
  const apply = (fn: () => void) => {
    applying = true;
    try {
      fn();
    } finally {
      applying = false;
    }
  };
  const error = (message: string) => {
    useAppStore.getState().setLastError(message);
    useLogStore.getState().addLog('sync', message);
  };
  taleSpireDriver.configure({
    role: () => useAppStore.getState().role,
    secret: () => useAppStore.getState().diceSecret,
    log: (message) => useLogStore.getState().addLog('roll', message),
    error,
    token: (token) => {
      const old = useRosterStore.getState().selectedToken;
      useRosterStore.getState().setSelectedToken(token);
      if (useAppStore.getState().role === 'gm' && token?.id !== old?.id)
        wsBridge.send('CREATURE_SELECTED', token);
    },
    bookmarks: (bookmarks) => useAppStore.getState().setBookmarks(bookmarks),
  });
  const subscriptions = [
    wsBridge.subscribe<{ connected: boolean }>('STATUS', (p) =>
      useAppStore.getState().setConnected(p.connected),
    ),
    wsBridge.subscribe<{ message: string }>('ERROR', (p) => error(p.message)),
    wsBridge.subscribe<{ message: string }>('ROLL_ERROR', (p) => error(p.message)),
    wsBridge.subscribe<{
      vault: string;
      campaignId: string;
      role: 'gm' | 'player';
      characterId?: string;
    }>('HANDSHAKE_ACK', (p) => {
      ownedId = p.characterId;
      configureCharacterStorage(p.campaignId);
      configureClueStorage(p.role === 'gm' ? 'gm' : `player:${p.characterId}`);
      useAppStore.setState({ lastError: '' });
      let cluesArchive: ReturnType<typeof readPersonalClues>['items'] = [];
      try {
        cluesArchive = readPersonalClues().items;
      } catch {
        error('Не удалось прочитать личный архив улик.');
      }
      setMediaLinks({});
      apply(() => {
        useAppStore.setState({ role: p.role, vaultName: p.vault, cinemaMedia: null });
        useRosterStore.setState({
          playerData: null,
          playerCharacterName: '',
          playerCharacterId: ownedId || '',
          roster: [],
          charactersById: {},
          cluesArchive,
          pinnedNames: getStoredArray(STORAGE_KEYS.PINNED_ROSTER),
        });
      });
    }),
    wsBridge.subscribe<Character[]>('CHARACTERS_LIST', (characters) =>
      apply(() => {
        if (!Array.isArray(characters)) return;
        const store = useRosterStore.getState();
        store.setRoster(characters);
        const selected =
          characters.find((c) => c.id === (ownedId || store.playerCharacterId)) ||
          characters.find((c) => c.playable);
        if (
          selected &&
          (selected.name !== store.playerCharacterName || selected.id !== store.playerCharacterId)
        )
          store.setPlayerCharacterName(selected.id || selected.name);
      }),
    ),
    wsBridge.subscribe<Character>('PLAYER_DATA', (data) =>
      apply(() => {
        if (
          !data ||
          typeof data.id !== 'string' ||
          typeof data.name !== 'string' ||
          wsBridge.hasPendingWrites(data.id)
        )
          return;
        useRosterStore.getState().setPlayerData(data);
      }),
    ),
    wsBridge.subscribe<{ name: string; path: string; content: string }>('NOTE_CONTENT', (note) => {
      if (note.path === useRosterStore.getState().selectedCharacter?.path)
        useRosterStore.getState().setNoteContent(note);
    }),
    wsBridge.subscribe<Scene[]>('SCENES_LIST', (scenes) => {
      if (Array.isArray(scenes)) useStoryStore.getState().setScenes(scenes);
    }),
    wsBridge.subscribe<CombatState>('COMBAT_STATE_UPDATE', (state) => {
      const parsed = combatSchema.safeParse(state);
      if (parsed.success) useCombatStore.getState().setFromSync(parsed.data);
    }),
    wsBridge.subscribe<VaultImage[]>('VAULT_IMAGES_LIST', (images) => {
      if (Array.isArray(images)) useAppStore.getState().setVaultImages(images);
    }),
    wsBridge.subscribe<Bookmark[]>('BOOKMARKS_LIST', (bookmarks) => {
      if (Array.isArray(bookmarks)) useAppStore.getState().setBookmarks(bookmarks);
    }),
    wsBridge.subscribe<Record<string, string>>('PUBLISHED_MEDIA', (links) => {
      setMediaLinks(links);
      useRosterStore.setState((state) => ({ cluesArchive: [...state.cluesArchive] }));
    }),
    wsBridge.subscribe<CinemaMediaPayload>('MEDIA_HANDOUT', (payload) => {
      if (mediaSchema.safeParse(payload).success) {
        rememberPublishedMedia(payload.url);
        useAppStore.getState().setCinemaMedia({ ...payload, active: true, source: 'broadcast' });
      }
    }),
    wsBridge.subscribe('DISMISS_HANDOUT', () => {
      if (useAppStore.getState().cinemaMedia?.source !== 'archive')
        useAppStore.getState().setCinemaMedia(null);
    }),
    wsBridge.subscribe('LOGGED_OUT', () =>
      apply(() => {
        ownedId = undefined;
        configureClueStorage();
        useAppStore.setState({ role: 'player', cinemaMedia: null, vaultImages: [] });
        useRosterStore.setState({
          roster: [],
          charactersById: {},
          playerData: null,
          playerCharacterName: '',
          playerCharacterId: '',
          noteContent: null,
          selectedCharacter: null,
          cluesArchive: [],
        });
        useStoryStore.getState().setScenes([]);
      }),
    ),
    useRosterStore.subscribe((next, previous) => {
      if (
        applying ||
        !next.playerData?.id ||
        !previous.playerData ||
        next.playerData.id !== previous.playerData.id
      )
        return;
      const changed = Object.fromEntries(
        metadataKeys
          .filter(
            (key) =>
              JSON.stringify(next.playerData![key]) !== JSON.stringify(previous.playerData![key]),
          )
          .map((key) => [key, next.playerData![key]]),
      );
      if (Object.keys(changed).length === 0) return;
      const parsed = stateSchema.safeParse(changed);
      if (!parsed.success) {
        error('Некорректные параметры персонажа');
        return;
      }
      wsBridge.send('UPDATE_CHARACTER_STATE', {
        characterId: next.playerData.id,
        state: parsed.data,
      });
    }),
  ];
  taleSpireDriver.init();
  wsBridge.start();
  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
    taleSpireDriver.dispose();
    wsBridge.dispose();
  };
}
