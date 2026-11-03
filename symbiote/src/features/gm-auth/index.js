// --- FSD: Features Layer - GM Authentication Feature ---

(function() {
    const authKey = window.TBConfig?.STORAGE_KEYS?.GM_AUTH || 'tb_gm_auth';
    const correctPin = window.TBConfig?.GM_PIN || '5';

    class GmAuthFeature {
        /**
         * Returns active GM PIN configured in Obsidian or constants
         * @returns {string}
         */
        getExpectedPin() {
            const dynamic = window.TBState?.get('gmPin');
            if (dynamic !== undefined && dynamic !== null) {
                return String(dynamic).trim();
            }
            return String(window.TBConfig?.GM_PIN ?? '5').trim();
        }

        /**
         * Checks if GM is already authenticated in this session
         * @returns {boolean}
         */
        isAuthenticated() {
            return sessionStorage.getItem(authKey) === 'true';
        }

        /**
         * Clears GM authentication for session
         */
        logout() {
            sessionStorage.removeItem(authKey);
        }

        /**
         * Displays PIN verification modal and returns promise resolving to boolean
         * @returns {Promise<boolean>}
         */
        requestGmPassword() {
            return new Promise((resolve) => {
                const expectedPin = this.getExpectedPin();

                // If PIN is empty, password protection is disabled by GM
                if (!expectedPin || this.isAuthenticated()) {
                    sessionStorage.setItem(authKey, 'true');
                    resolve(true);
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'gm-auth-modal';
                modal.innerHTML = `
                    <div class="gm-auth-backdrop"></div>
                    <div class="gm-auth-card">
                        <div class="gm-auth-title">Доступ к пульту Гейм-Мастера</div>
                        <div class="gm-auth-desc">Введите пароль для перехода в режим управления:</div>
                        <div class="gm-auth-input-box">
                            <input type="password" id="gmAuthPasswordInput" class="gm-auth-input" placeholder="Пароль" autofocus autocomplete="off" />
                        </div>
                        <div id="gmAuthError" class="gm-auth-error" style="display: none;">Неверный пароль Мастера</div>
                        <div class="gm-auth-actions">
                            <button id="btnGmAuthSubmit" class="btn-primary">Войти</button>
                            <button id="btnGmAuthCancel" class="btn-secondary">Отмена</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                const input = modal.querySelector('#gmAuthPasswordInput');
                const error = modal.querySelector('#gmAuthError');
                const btnSubmit = modal.querySelector('#btnGmAuthSubmit');
                const btnCancel = modal.querySelector('#btnGmAuthCancel');
                const backdrop = modal.querySelector('.gm-auth-backdrop');

                input.focus();

                const cleanup = (result) => {
                    modal.remove();
                    resolve(result);
                };

                const checkPassword = () => {
                    const val = (input.value || '').trim();
                    if (val === expectedPin) {
                        sessionStorage.setItem(authKey, 'true');
                        cleanup(true);
                    } else {
                        error.style.display = 'block';
                        input.value = '';
                        input.focus();
                        modal.querySelector('.gm-auth-card')?.classList.add('shake');
                        setTimeout(() => modal.querySelector('.gm-auth-card')?.classList.remove('shake'), 400);
                    }
                };

                btnSubmit.onclick = checkPassword;
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') checkPassword();
                    if (e.key === 'Escape') cleanup(false);
                };
                btnCancel.onclick = () => cleanup(false);
                backdrop.onclick = () => cleanup(false);
            });
        }
    }

    const instance = new GmAuthFeature();
    window.TBFeatureGmAuth = instance;
    window.TBFeatures = window.TBFeatures || {};
    window.TBFeatures.gmAuth = instance;
})();
