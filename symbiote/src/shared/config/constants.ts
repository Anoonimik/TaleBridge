import { ConditionMeta } from '../types';

export const CONDITIONS: ConditionMeta[] = [
  {
    name: 'blinded',
    label: 'Ослеплён',
    color: '#64748b',
    desc: 'Существо не видит и автоматически проваливает проверки зрения. Броски атак по нему с преимуществом, а его собственные атаки — с помехой.',
  },
  {
    name: 'charmed',
    label: 'Очарован',
    color: '#ec4899',
    desc: 'Не может атаковать пленителя или делать его целью вредоносных эффектов. Пленитель имеет преимущество на социальные проверки.',
  },
  {
    name: 'deafened',
    label: 'Оглушён (слух)',
    color: '#94a3b8',
    desc: 'Существо ничего не слышит и автоматически проваливает проверки характеристик, требующие слуха.',
  },
  {
    name: 'frightened',
    label: 'Испуган',
    color: '#a855f7',
    desc: 'Помеха на проверки и атаки, пока источник страха в поле зрения. Существо не может добровольно приближаться к источнику страха.',
  },
  {
    name: 'grappled',
    label: 'Захвачен',
    color: '#eab308',
    desc: 'Скорость равна 0. Состояние оканчивается, если схвативший выведен из строя или существо вытолкнуто из зоны досягаемости.',
  },
  {
    name: 'incapacitated',
    label: 'Недееспособен',
    color: '#ef4444',
    desc: 'Существо не может совершать действия и реакции.',
  },
  {
    name: 'invisible',
    label: 'Невидим',
    color: '#06b6d4',
    desc: 'Невозможно увидеть без магии. Атаки существа совершаются с преимуществом, а атаки по нему — с помехой.',
  },
  {
    name: 'paralyzed',
    label: 'Парализован',
    color: '#dc2626',
    desc: 'Недееспособен, скорость 0. Авто-провал спасов СИЛ и ЛОВ. Атаки по нему с преимуществом, а попадания с 5 футов — критические.',
  },
  {
    name: 'petrified',
    label: 'Окаменён',
    color: '#78716c',
    desc: 'Превращён в камень, вес x10, недееспособен, скорость 0. Сопротивление всему урону, иммунитет к яду и болезням.',
  },
  {
    name: 'poisoned',
    label: 'Отравлен',
    color: '#22c55e',
    desc: 'Отравленное существо совершает с помехой все броски атак и проверки характеристик.',
  },
  {
    name: 'prone',
    label: 'Сбит с ног',
    color: '#f97316',
    desc: 'Передвижение только ползком (вдвое медленнее). Помеха на свои атаки. Атаки в упор (5 фт) с преимуществом, дистанционные — с помехой.',
  },
  {
    name: 'restrained',
    label: 'Опутан',
    color: '#ca8a04',
    desc: 'Скорость равна 0. Атаки по нему с преимуществом, свои атаки с помехой, помеха на спасброски Ловкости.',
  },
  {
    name: 'stunned',
    label: 'Ошеломлён',
    color: '#e11d48',
    desc: 'Недееспособен, не перемещается, говорит запинаясь. Авто-провал спасбросков СИЛ и ЛОВ. Атаки по нему с преимуществом.',
  },
  {
    name: 'unconscious',
    label: 'Без сознания',
    color: '#991b1b',
    desc: 'Недееспособен, роняет предметы, падает ничком. Авто-провал спасов СИЛ и ЛОВ. Атаки по нему с преимуществом, криты с 5 футов.',
  },
  {
    name: 'exhaustion',
    label: 'Истощение',
    color: '#d97706',
    desc: 'Степени истощения (1-6): помехи на проверки, скорость вдвое, помехи на атаки/спасы, ХП вдвое, скорость 0, смерть.',
  },
];

export const COMBAT_SIDES = [
  { id: 'player' as const, label: 'Игроки', color: '#3b82f6', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  { id: 'ally' as const, label: 'Союзники', color: '#10b981', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  { id: 'neutral' as const, label: 'Нейтралы', color: '#eab308', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  { id: 'enemy' as const, label: 'Враги', color: '#ef4444', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
];

export const STORAGE_KEYS = {
  ROLE: 'tb_role',
  SCALE: 'tb_scale',
  PINNED_ROSTER: 'tb_pinned_roster',
  CLUES_ARCHIVE: 'tb_clues_archive',
  ACTIVE_CHARACTER: 'tb_active_character',
  GM_AUTH: 'tb_gm_auth',
  PLAYER_DATA: 'tb_player_data',
  PLAYER_CHARACTER: 'tb_player_character',
  GM_PIN: 'tb_gm_pin',
};

/** Default port for TaleBridge Obsidian plugin WebSocket/HTTP server. */
export const DEFAULT_WS_PORT = 30123;
