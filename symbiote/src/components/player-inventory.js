// --- TaleBridge Player Interactive Inventory Component ---

(function() {
    class PlayerInventory {
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

            const playerData = window.TBState.get('playerData') || {};
            const inv = items || playerData.inventory || [];

            // Calculate weight and carry limit
            const totalWeight = inv.reduce((sum, it) => sum + ((parseFloat(it.weight) || 0) * (parseInt(it.quantity, 10) || 1)), 0);
            
            // Carry limit based on Strength
            let strScore = 14;
            if (playerData.stats && playerData.stats.str) {
                const match = String(playerData.stats.str).match(/(\d+)/);
                if (match) strScore = parseInt(match[1], 10) || 14;
            }
            const maxWeight = Math.round(strScore * 7.5); // D&D 5e: STR * 15 lbs = ~7.5 kg
            const weightPercent = Math.min(100, Math.round((totalWeight / (maxWeight || 1)) * 100));
            const weightClass = weightPercent > 100 ? 'overweight' : (weightPercent > 75 ? 'heavy' : 'normal');

            // Filter items
            const filtered = inv.filter(it => {
                if (this.activeCategory !== 'all') {
                    const cat = (it.category || 'Снаряжение').toLowerCase();
                    if (cat !== this.activeCategory.toLowerCase()) return false;
                }
                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    const n = (it.name || '').toLowerCase();
                    const d = (it.description || '').toLowerCase();
                    const c = (it.category || '').toLowerCase();
                    if (!n.includes(q) && !d.includes(q) && !c.includes(q)) return false;
                }
                return true;
            });

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
                        <input type="text" id="invSearchInput" class="inv-search-input" placeholder="Поиск предмета..." value="${this.escapeHtml(this.searchQuery)}" />
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
                        : filtered.map(item => this.renderItemCard(item)).join('')
                    }
                </div>
            `;

            this.bindEvents(inv);
        }

        renderItemCard(item) {
            const cat = item.category || 'Снаряжение';
            const catBadgeClass = 'cat-' + cat.toLowerCase().replace(/[^a-zа-яё]/gi, '');
            const totalItemWeight = ((parseFloat(item.weight) || 0) * (parseInt(item.quantity, 10) || 1)).toFixed(1);

            return `
                <div class="inv-item-card ${item.equipped ? 'equipped' : ''}" data-id="${item.id}">
                    <div class="inv-item-main-row">
                        <label class="inv-equip-checkbox-label" title="${item.equipped ? 'Экипировано' : 'Экипировать'}">
                            <input type="checkbox" class="inv-equip-check" ${item.equipped ? 'checked' : ''} />
                            <span class="custom-checkbox"></span>
                        </label>
                        <div class="inv-item-info">
                            <div class="inv-item-title-row">
                                <span class="inv-item-name">${this.escapeHtml(item.name)}</span>
                                <span class="inv-cat-tag ${catBadgeClass}">${this.escapeHtml(cat)}</span>
                                ${item.equipped ? '<span class="equipped-tag">Надето</span>' : ''}
                            </div>
                            ${item.description ? `<div class="inv-item-desc">${this.escapeHtml(item.description)}</div>` : ''}
                        </div>
                        <div class="inv-item-actions">
                            <div class="inv-qty-box">
                                <button class="btn-qty-minus" title="Уменьшить">-</button>
                                <span class="inv-qty-val">${item.quantity || 1}</span>
                                <button class="btn-qty-plus" title="Увеличить">+</button>
                            </div>
                            <div class="inv-item-weight" title="Вес: ${item.weight || 0} кг/шт (всего ${totalItemWeight} кг)">
                                ${totalItemWeight} кг
                            </div>
                            <button class="btn-delete-item" title="Удалить предмет">✕</button>
                        </div>
                    </div>
                </div>
            `;
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
                            // If quantity is 1 and minus is clicked, delete item
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

                // Delete
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

                        // Prime for deletion
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
            const charName = window.TBState.get('playerCharacter');
            if (!charName) return;

            const pData = window.TBState.get('playerData') || {};
            pData.inventory = updatedItems;
            window.TBState.set('playerData', { ...pData });

            window.TBNetwork.send('UPDATE_INVENTORY', {
                characterName: charName,
                items: updatedItems
            });

            this.render(updatedItems);
        }

        escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
    }

    window.TBPlayerInventory = new PlayerInventory();
})();