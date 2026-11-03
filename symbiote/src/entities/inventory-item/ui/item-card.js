// --- FSD: Entities Layer - Inventory Item Card UI ---

(function() {
    const TBItemCard = {
        /**
         * Renders HTML markup for an inventory item card
         * @param {Object} item 
         * @returns {string} HTML markup
         */
        render(item) {
            const escape = window.TBTextUtils?.escapeHtml || (s => s);
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
                                <span class="inv-item-name">${escape(item.name)}</span>
                                <span class="inv-cat-tag ${catBadgeClass}">${escape(cat)}</span>
                                ${item.equipped ? '<span class="equipped-tag">Надето</span>' : ''}
                            </div>
                            ${item.description ? `<div class="inv-item-desc">${escape(item.description)}</div>` : ''}
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
    };

    window.TBItemCard = TBItemCard;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.itemCard = TBItemCard;
})();
