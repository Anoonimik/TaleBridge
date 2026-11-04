import { ConditionMeta } from '../types';

export const CONDITIONS: ConditionMeta[] = [
  { name: 'blinded', label: 'Ослеплён', color: '#64748b', desc: 'Авто-провал проверок зрения. Помеха на атаки. Атаки по существу с преимуществом.' },
  { name: 'charmed', label: 'Очарован', color: '#ec4899', desc: 'Не может атаковать чародея. Чародей имеет преимущество на социальные проверки.' },
  { name: 'deafened', label: 'Оглушён (слух)', color: '#94a3b8', desc: 'Авто-провал проверок слуха.' },
  { name: 'frightened', label: 'Испуган', color: '#f59e0b', desc: 'Помеха на проверки и атаки, пока источник страха в поле зрения. Не может приблизиться.' },
  { name: 'grappled', label: 'Захвачен', color: '#d97706', desc: 'Скорость равна 0.' },
  { name: 'incapacitated', label: 'Недееспособен', color: '#ef4444', desc: 'Не может совершать действия и реакции.' },
  { name: 'invisible', label: 'Невидим', color: '#06b6d4', desc: 'Атаки с преимуществом. Атаки по существу с помехой.' },
  { name: 'paralyzed', label: 'Парализован', color: '#dc2626', desc: 'Недееспособен, скорость 0. Авто-провал спасбросков СИЛ и ЛОВ. Криты в радиусе 5 фт.' },
  { name: 'petrified', label: 'Окаменён', color: '#78716c', desc: 'Превращён в камень, сопротивление ко всему урону, иммунитет к яду.' },
  { name: 'poisoned', label: 'Отравлен', color: '#10b981', desc: 'Помеха на броски атак и проверки характеристик.' },
  { name: 'prone', label: 'Сбит с ног', color: '#b45309', desc: 'Ползает. Помеха на свои атаки. Атаки с 5 фт с преимуществом, дальше — с помехой.' },
  { name: 'restrained', label: 'Опутан', color: '#b91c1c', desc: 'Скорость 0. Атаки с помехой. Атаки по существу с преимуществом. Помеха на спасброски ЛОВ.' },
  { name: 'stunned', label: 'Ошеломлён', color: '#e11d48', desc: 'Недееспособен, скорость 0. Атаки по существу с преимуществом. Авто-провал спасбросков СИЛ и ЛОВ.' },
  { name: 'unconscious', label: 'Бессознателен', color: '#991b1b', desc: 'Недееспособен, бросает предметы, скорость 0. Авто-криты в радиусе 5 фт.' },
  { name: 'exhaustion', label: 'Истощение', color: '#6366f1', desc: 'Уровни истощения (помехи, снижение скорости, вплоть до смерти).' },
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
};
