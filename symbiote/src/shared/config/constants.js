// --- FSD: Shared Layer - Configuration & Constants ---

(function() {
    const TBConfig = {
        WS_PORT: 30123,
        WS_URL: 'ws://127.0.0.1:30123',
        HTTP_HOST: 'http://127.0.0.1:30123',
        FALLBACK_PORT: 30122,

        ROLES: {
            GM: 'gm',
            PLAYER: 'player'
        },

        GM_PIN: '5',

        STORAGE_KEYS: {
            ROLE: 'tb_user_role',
            PLAYER_CHAR: 'tb_player_char',
            PINNED_CHARS: 'tb_pinned_chars',
            CLUES_ARCHIVE: 'tb_clues_archive',
            AUTO_INSPECT: 'tb_auto_inspect',
            COMPACT_MODE: 'tb_compact_mode',
            GM_AUTH: 'tb_gm_auth',
            GM_DICE_MODE: 'tb_gm_dice_mode',
            COMBAT_STATE: 'tb_combat_state'
        },

        CONDITIONS_DND5E: [
            { id: 'blinded', name: 'Ослеплен', en: 'Blinded', color: '#64748b', desc: 'Авто-провал проверок зрения. Помеха на свои атаки, атаки по нему с преимуществом.' },
            { id: 'charmed', name: 'Очарован', en: 'Charmed', color: '#ec4899', desc: 'Не может атаковать чародея. У чародея преимущество на социальные проверки.' },
            { id: 'deafened', name: 'Оглушен (слух)', en: 'Deafened', color: '#94a3b8', desc: 'Авто-провал проверок на слух.' },
            { id: 'frightened', name: 'Испуган', en: 'Frightened', color: '#a855f7', desc: 'Помеха на проверки и атаки, пока видит источник страха. Не может приближаться к нему.' },
            { id: 'grappled', name: 'Схвачен', en: 'Grappled', color: '#eab308', desc: 'Скорость равна 0. Оканчивается, если схвативший выведен из строя.' },
            { id: 'incapacitated', name: 'Недееспособен', en: 'Incapacitated', color: '#ef4444', desc: 'Не может совершать действия и реакции.' },
            { id: 'invisible', name: 'Невидим', en: 'Invisible', color: '#06b6d4', desc: 'Считается тяжело заслоненным. Преимущество на свои атаки, атаки по нему с помехой.' },
            { id: 'paralyzed', name: 'Парализован', en: 'Paralyzed', color: '#dc2626', desc: 'Недееспособен, скорость 0. Провал спасов СИЛ и ЛОВ. Атаки по нему с преимуществом, критические в упор (5 фт).' },
            { id: 'petrified', name: 'Окаменел', en: 'Petrified', color: '#78716c', desc: 'Вес x10, недееспособен. Сопротивление всему урону, иммунитет к яду.' },
            { id: 'poisoned', name: 'Отравлен', en: 'Poisoned', color: '#22c55e', desc: 'Помеха на броски атак и проверки характеристик.' },
            { id: 'prone', name: 'Сбит с ног', en: 'Prone', color: '#f97316', desc: 'Перемещение только ползком (вдвое медленнее). Атаки в упор с преимуществом, дистанционные с помехой. Свои атаки с помехой.' },
            { id: 'restrained', name: 'Опутан', en: 'Restrained', color: '#ca8a04', desc: 'Скорость 0. Атаки по нему с преимуществом, свои атаки с помехой, помеха на спасброски ЛОВ.' },
            { id: 'stunned', name: 'Оглушен', en: 'Stunned', color: '#e11d48', desc: 'Недееспособен, скорость 0, говорит запинаясь. Провал спасов СИЛ и ЛОВ. Атаки по нему с преимуществом.' },
            { id: 'unconscious', name: 'Без сознания', en: 'Unconscious', color: '#991b1b', desc: 'Недееспособен, роняет предметы, падает ничком. Провал спасов СИЛ и ЛОВ. Авто-крит в пределах 5 фт.' },
            { id: 'exhaustion', name: 'Истощение', en: 'Exhaustion', color: '#d97706', desc: 'Уровни истощения (1-6): помехи на проверки, снижение скорости, смерть на 6 уровне.' }
        ],

        DEFAULTS: {
            HEROES: [
                { name: 'Артём', class: 'Воин / Плут', category: 'Игроки', playable: true },
                { name: 'Пачка Глицина', class: 'Варвар (Берсерк)', category: 'Игроки', playable: true }
            ]
        }
    };

    window.TBConfig = TBConfig;
    window.TBShared = window.TBShared || {};
    window.TBShared.config = TBConfig;
})();
