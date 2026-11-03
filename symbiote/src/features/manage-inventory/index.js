// --- FSD: Features Layer - Manage Inventory Feature ---

(function() {
    class ManageInventoryFeature {
        constructor() {
            this.container = null;
            this.activeCategory = 'all';
            this.searchQuery = '';
            this.isAddingItem = false;
        }

        init(containerId = 'playerInventoryBox') {
            this.container = document.getElementById(containerId);
        }

        render(items) {
            if (!this.container) return;

            const playerData = window.TBState?.get('playerData') || {};
            const inv = items || playerData.inventory || [];

            const totalWeight = window.TBInventoryModel?.calculateTotalWeight(inv) || 0;
            const maxWeight = window.TBInventoryModel?.calculateMaxCarryWeight(playerData.stats?.str) || 105;
            const { percent: weightPercent, className: weightClass } = window.TBInventoryModel?.getWeightStatus(totalWeight, maxWeight) || { percent: 0, className: 'normal' };

            const filtered = window.TBInventoryModel?.filterItems(inv, this.activeCategory, this.searchQuery) || inv;
            const escape = window.TBTextUtils?.escapeHtml || (s => s);

            this.container.innerHTML = `
                <div class="inventory-header-panel">
                    <div class="weight-gauge-box">
                        <div class="weight-label-row">
                            <span class="weight-title">Переносимый вес</span>
                            <span class="weight-numbers ${weightClass}">
                                <strong>${totalWeight.toFixed(1)}</strong> / ${maxWeight} кг (${weightPercent}%)
                            </span>
                        </div>
                        <div class="weight-bar-bg">
                            <div class="weight-bar-fill ${weightClass}" style="width: ${Math.min(100, weightPercent)}%;"></div>
                        </div>
                    </div>
                    <div class="inventory-controls-row">
                        <input type="text" id="invSearchInput" class="inv-search-input" placeholder="Поиск предмета..." value="${escape(this.searchQuery)}" />
                        <button id="btnOpenAddItem" class="btn-add-item primary">+ Предмет</button>
                    </div>
                    <div class="inv-categories-bar">
                        <button class="inv-cat-pill ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">Все (${inv.length})</button>
                        <button class="inv-cat-pill ${this.activeCategory === 'Оружие' ? 'active' : ''}" data-cat="Оружие">Оружие</button>
                        <button class="inv-cat-pill ${this.activeCategory === 'Броня' ? 'active' : ''}" data-cat="Броня">Броня</button>
                        <button class="inv-cat-pill ${this.activeCategory === 'Зелья' ? 'active' : ''}" data-cat="Зелья">Зелья</button>
                        <button class="inv-cat-pill ${this.activeCategory === 'Снаряжение' ? 'active' : ''}" data-cat="Снаряжение">Снаряжение</button>
                        <button class="inv-cat-pill ${this.activeCategory === 'Квестовое' ? 'active' : ''}" data-cat="Квестовое">Квестовое</button>
                    </div>
                </div>

                <!-- Inline Add Item Form -->
                <div id="addItemCard" class="add-item-card" style="display: ${this.isAddingItem ? 'block' : 'none'};">
                    <div class="add-item-title">Новый предмет в инвентарь</div>
                    <div class="add-item-grid">
                        <div class="input-group">
                            <label>Название</label>
                            <input type="text" id="newItName" placeholder="Например: Зелье исцеления" />
                        </div>
                        <div class="input-group">
                            <label>Категория</label>
                            <select id="newItCategory">
                                <option value="Снаряжение">Снаряжение</option>
                                <option value="Оружие">Оружие</option>
                                <option value="Броня">Броня</option>
                                <option value="Зелья">Зелья</option>
                                <option value="Квестовое">Квестовое</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Кол-во</label>
                            <input type="number" id="newItQty" value="1" min="1" />
                        </div>
                        <div class="input-group">
                            <label>Вес за шт (кг)</label>
                            <input type="number" id="newItWeight" value="0.5" step="0.1" min="0" />
                        </div>
                    </div>
                    <div class="input-group" style="margin-top: 6px;">
                        <label>Описание</label>
                        <input type="text" id="newItDesc" placeholder="Свойства, эффекты или примечание" />
                    </div>
                    <div class="add-item-buttons">
                        <button id="btnSaveNewItem" class="btn-save-item">Сохранить в Obsidian</button>
                        <button id="btnCancelAddItem" class="btn-cancel-item">Отмена</button>
                    </div>
                </div>

                <!-- Items List -->
                <div class="inventory-items-list">
                    ${filtered.length === 0 
                        ? `<div class="empty-hint">Предметы не найдены</div>`
                        : filtered.map(item => window.TBItemCard?.render(item) || '').join('')
                    }
                </div>
            `;

            this.bindEvents(inv);
        }

        bindEvents(items) {
            // Search input
            const searchInput = this.container.querySelector('#invSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchQuery = e.target.value;
                    this.render(items);
                });
            }

            // Categories
            this.container.querySelectorAll('.inv-cat-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.activeCategory = btn.dataset.cat;
                    this.render(items);
                });
            });

            // Toggle Add Form
            const btnOpenAdd = this.container.querySelector('#btnOpenAddItem');
            if (btnOpenAdd) {
                btnOpenAdd.addEventListener('click', () => {
                    this.isAddingItem = !this.isAddingItem;
                    this.render(items);
                });
            }

            const btnCancel = this.container.querySelector('#btnCancelAddItem');
            if (btnCancel) {
                btnCancel.addEventListener('click', () => {
                    this.isAddingItem = false;
                    this.render(items);
                });
            }

            // Save New Item
            const btnSave = this.container.querySelector('#btnSaveNewItem');
            if (btnSave) {
                btnSave.addEventListener('click', () => {
                    const nameInput = this.container.querySelector('#newItName');
                    const name = (nameInput?.value || '').trim();
                    if (!name) {
                        if (nameInput) {
                            nameInput.focus();
                            nameInput.classList.add('input-error-shake');
                            setTimeout(() => nameInput.classList.remove('input-error-shake'), 600);
                        }
                        return;
                    }
                    const category = this.container.querySelector('#newItCategory')?.value || 'Снаряжение';
                    const quantity = parseInt(this.container.querySelector('#newItQty')?.value, 10) || 1;
                    const weight = parseFloat(this.container.querySelector('#newItWeight')?.value) || 0;
                    const description = (this.container.querySelector('#newItDesc')?.value || '').trim();

                    const newItem = {
                        id: 'it_' + Math.random().toString(36).substring(2, 9),
                        name,
                        category,
                        quantity,
                        weight,
                        description,
                        equipped: category === 'Оружие' || category === 'Броня'
                    };

                    const updatedItems = [newItem, ...items];
                    this.isAddingItem = false;
                    this.saveInventory(updatedItems);
                });
            }

            // Items list events (equip, qty +, qty -, delete)
            this.container.querySelectorAll('.inv-item-card').forEach(card => {
                const itemId = card.dataset.id;
                const item = items.find(it => it.id === itemId);
                if (!item) return;

                // Equip Checkbox
                const equipCheck = card.querySelector('.inv-equip-check');
                if (equipCheck) {
                    equipCheck.addEventListener('change', () => {
                        item.equipped = equipCheck.checked;
                        this.saveInventory(items);
                    });
                }

                // Qty Minus
                const btnMinus = card.querySelector('.btn-qty-minus');
                if (btnMinus) {
                    btnMinus.addEventListener('click', () => {
                        if (item.quantity > 1) {
                            item.quantity -= 1;
                            this.saveInventory(items);
                        } else {
                            const remaining = items.filter(it => it.id !== itemId);
                            this.saveInventory(remaining);
                        }
                    });
                }

                // Qty Plus
                const btnPlus = card.querySelector('.btn-qty-plus');
                if (btnPlus) {
                    btnPlus.addEventListener('click', () => {
                        item.quantity = (item.quantity || 1) + 1;
                        this.saveInventory(items);
                    });
                }

                // 2-Step Inline Delete (Shift+Click for instant, or click -> "Удалить?" with 3.5s timeout)
                const btnDel = card.querySelector('.btn-delete-item');
                if (btnDel) {
                    btnDel.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (e.shiftKey || btnDel.dataset.primed === 'true') {
                            if (btnDel._resetTimer) clearTimeout(btnDel._resetTimer);
                            const remaining = items.filter(it => it.id !== itemId);
                            this.saveInventory(remaining);
                            return;
                        }

                        // Reset any other primed delete buttons first
                        this.container.querySelectorAll('.btn-delete-item[data-primed="true"]').forEach(other => {
                            if (other._resetTimer) clearTimeout(other._resetTimer);
                            other.dataset.primed = 'false';
                            other.classList.remove('confirm-delete');
                            other.textContent = '✕';
                            other.title = 'Удалить';
                        });

                        btnDel.dataset.primed = 'true';
                        btnDel.classList.add('confirm-delete');
                        btnDel.textContent = 'Удалить?';
                        btnDel.title = 'Нажмите ещё раз для подтверждения удаления';

                        btnDel._resetTimer = setTimeout(() => {
                            btnDel.dataset.primed = 'false';
                            btnDel.classList.remove('confirm-delete');
                            btnDel.textContent = '✕';
                            btnDel.title = 'Удалить';
                        }, 3500);
                    });
                }
            });
        }

        saveInventory(updatedItems) {
            const charName = window.TBState?.get('playerCharacter');
            if (!charName) return;

            const pData = window.TBState?.get('playerData') || {};
            pData.inventory = updatedItems;
            window.TBState?.set('playerData', { ...pData });

            if (window.TBNetwork) {
                window.TBNetwork.send('UPDATE_INVENTORY', {
                    characterName: charName,
                    items: updatedItems
                });
            }

            this.render(updatedItems);
        }
    }

    const instance = new ManageInventoryFeature();
    window.TBFeatureManageInventory = instance;
    // Backward compatibility with legacy component
    window.TBPlayerInventory = instance;
    window.TBFeatures = window.TBFeatures || {};
    window.TBFeatures.manageInventory = instance;
})();
