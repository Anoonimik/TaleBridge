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
            GM_DICE_MODE: 'tb_gm_dice_mode'
        },

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
