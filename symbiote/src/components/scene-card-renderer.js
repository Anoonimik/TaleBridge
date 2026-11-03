// --- TaleBridge Scene Card Renderer Component ---

(function() {
    const TBSceneCardRenderer = {
        /**
         * Renders the top context header card (Session badge, Title, Goal, Cast, Camera button, Nudge button)
         * @param {Object} scene 
         * @param {Object} options 
         * @returns {HTMLElement}
         */
        renderContextHeader(scene, options = {}) {
            const headerCard = document.createElement('div');
            headerCard.className = 'scene-context-card';

            if (scene.session) {
                const sessBadge = document.createElement('div');
                sessBadge.className = 'scene-context-session';
                sessBadge.textContent = scene.session;
                headerCard.appendChild(sessBadge);
            }

            const topRow = document.createElement('div');
            topRow.className = 'scene-context-top';

            const titleRow = document.createElement('div');
            titleRow.className = 'scene-context-title';
            titleRow.textContent = scene.title;
            topRow.appendChild(titleRow);

            const actionsBox = document.createElement('div');
            actionsBox.className = 'scene-context-actions';

            // Camera Bookmark Button
            const bookmarks = window.TBState.get('bookmarks') || [];
            const searchKey = (scene.location || scene.title || '').toLowerCase();
            const matchedBookmark = bookmarks.find(b => 
                searchKey.includes(b.name.toLowerCase()) || 
                b.name.toLowerCase().includes(searchKey)
            );

            if (matchedBookmark) {
                const camBtn = document.createElement('button');
                camBtn.className = 'btn-scene-action cam-btn';
                camBtn.textContent = `Камера: ${matchedBookmark.name}`;
                camBtn.title = `Навести камеру TaleSpire на закладку «${matchedBookmark.name}»`;
                camBtn.onclick = () => {
                    if (window.TBApi && window.TBApi.gotoBookmark) {
                        window.TBApi.gotoBookmark(matchedBookmark.id, matchedBookmark.name);
                    }
                };
                actionsBox.appendChild(camBtn);
            }

            // Emergency Nudge Quick Button
            if (scene.nudge) {
                const nudgeBtn = document.createElement('button');
                nudgeBtn.className = `btn-scene-action nudge-btn ${options.isEmergencyNudgeVisible ? 'active' : ''}`;
                nudgeBtn.textContent = 'Пинок Мастера';
                nudgeBtn.title = 'Подсказка: что делать, если игроки застряли или молчат';
                nudgeBtn.onclick = () => {
                    if (options.onToggleNudge) {
                        options.onToggleNudge();
                    }
                };
                actionsBox.appendChild(nudgeBtn);
            }

            topRow.appendChild(actionsBox);
            headerCard.appendChild(topRow);

            // Goal Box
            if (scene.goal) {
                const goalBox = document.createElement('div');
                goalBox.className = 'scene-goal-box';
                goalBox.innerHTML = `<b>Главная цель сцены:</b> ${window.TBTextUtils.formatInlineMarkdown(scene.goal)}`;
                headerCard.appendChild(goalBox);
            }

            // Cast row
            if (scene.cast && scene.cast.length > 0) {
                const castBox = document.createElement('div');
                castBox.className = 'scene-cast-box';

                const label = document.createElement('span');
                label.className = 'scene-cast-label';
                label.textContent = 'Участники:';
                castBox.appendChild(label);

                scene.cast.forEach(charName => {
                    const chip = document.createElement('button');
                    chip.className = 'cast-chip';
                    chip.textContent = charName;
                    chip.title = `Открыть карточку ${charName} в ростере`;
                    chip.onclick = () => {
                        if (options.onSelectCharacter) {
                            options.onSelectCharacter(charName);
                        }
                    };
                    castBox.appendChild(chip);
                });

                headerCard.appendChild(castBox);
            }

            // Emergency Nudge Banner (Collapsible banner inside context card)
            if (scene.nudge) {
                const banner = document.createElement('div');
                banner.id = 'emergencyNudgeBanner';
                banner.className = 'gm-nudge-box banner';
                banner.style.display = options.isEmergencyNudgeVisible ? 'flex' : 'none';

                const nHead = document.createElement('div');
                nHead.className = 'gm-nudge-header';
                nHead.innerHTML = '<span class="gm-nudge-title">Пинок Мастера (если игроки застряли)</span>';

                const nClose = document.createElement('button');
                nClose.className = 'btn-close-nudge';
                nClose.textContent = '✕';
                nClose.onclick = () => {
                    if (options.onToggleNudge) {
                        options.onToggleNudge(false);
                    }
                };
                nHead.appendChild(nClose);

                const nText = document.createElement('div');
                nText.className = 'gm-nudge-text';
                nText.innerHTML = window.TBTextUtils.formatInlineMarkdown(scene.nudge);

                banner.appendChild(nHead);
                banner.appendChild(nText);
                headerCard.appendChild(banner);
            }

            return headerCard;
        },

        /**
         * Renders Card 1: Read-Aloud & Senses
         * @param {Object} scene 
         * @returns {HTMLElement}
         */
        renderReadAloudCard(scene) {
            const card = document.createElement('div');
            card.className = 'scene-section-card read-aloud-card';

            const header = document.createElement('div');
            header.className = 'section-card-header';
            header.innerHTML = '<span class="section-card-title">Зачитайте игрокам</span>';

            const actions = document.createElement('div');
            actions.className = 'section-header-actions';

            if (scene.readAloud) {
                const btnCopy = document.createElement('button');
                btnCopy.className = 'btn-section-action';
                btnCopy.textContent = 'Скопировать';
                btnCopy.onclick = (e) => {
                    e.stopPropagation();
                    window.TBTextUtils.copyToClipboard(scene.readAloud, btnCopy, 'Скопировано', 'Скопировать');
                };

                const btnChat = document.createElement('button');
                btnChat.className = 'btn-section-action chat-btn';
                btnChat.textContent = 'В чат игры';
                btnChat.title = 'Отправить художественное описание игрокам в чат TaleSpire';
                btnChat.onclick = (e) => {
                    e.stopPropagation();
                    window.TBTextUtils.sendChatMessage(scene.readAloud, btnChat, 'В чате', 'В чат игры');
                };

                actions.appendChild(btnCopy);
                actions.appendChild(btnChat);
            }

            header.appendChild(actions);
            card.appendChild(header);

            const content = document.createElement('div');
            content.className = 'section-card-content';

            // Sensory Cue Box
            if (scene.sensory) {
                const sensoryEl = document.createElement('div');
                sensoryEl.className = 'scene-sensory-box';
                sensoryEl.innerHTML = `<b>Атмосфера:</b> ${window.TBTextUtils.formatInlineMarkdown(scene.sensory)}`;
                content.appendChild(sensoryEl);
            }

            // Read-Aloud Text
            if (scene.readAloud) {
                const textEl = document.createElement('div');
                textEl.className = 'read-aloud-text';
                const paras = scene.readAloud.split(/\n\n+/);
                paras.forEach(p => {
                    const pEl = document.createElement('p');
                    pEl.innerHTML = window.TBTextUtils.formatInlineMarkdown(p);
                    textEl.appendChild(pEl);
                });
                content.appendChild(textEl);
            }

            card.appendChild(content);
            return card;
        },

        /**
         * Renders Card 2: Roleplay Dossier & Dialogue Cues
         * @param {Object} scene 
         * @returns {HTMLElement}
         */
        renderRoleplayCard(scene) {
            const card = document.createElement('div');
            card.className = 'scene-section-card roleplay-card';

            const header = document.createElement('div');
            header.className = 'section-card-header';
            header.innerHTML = '<span class="section-card-title">Отыгрыш и реплики</span>';
            card.appendChild(header);

            const content = document.createElement('div');
            content.className = 'section-card-content';

            // Personas (Dossiers)
            if (scene.personas && scene.personas.length > 0) {
                scene.personas.forEach(p => {
                    const pBox = document.createElement('div');
                    pBox.className = 'persona-dossier-box';

                    const pTitle = document.createElement('div');
                    pTitle.className = 'persona-title';
                    pTitle.innerHTML = `<span>${p.title}</span>`;
                    pBox.appendChild(pTitle);

                    const pBody = document.createElement('div');
                    pBody.className = 'persona-body';
                    const lines = p.body.split('\n').filter(l => l.trim().length > 0);
                    let bodyHtml = '<ul>';
                    lines.forEach(l => {
                        const clean = l.trim().replace(/^[-*]\s*/, '');
                        bodyHtml += `<li>${window.TBTextUtils.formatInlineMarkdown(clean)}</li>`;
                    });
                    bodyHtml += '</ul>';
                    pBody.innerHTML = bodyHtml;
                    pBox.appendChild(pBody);

                    content.appendChild(pBox);
                });
            }

            // Dialogue Cues
            if (scene.dialogues && scene.dialogues.length > 0) {
                const dSub = document.createElement('div');
                dSub.className = 'section-subtitle';
                dSub.textContent = 'Характерные фразы:';
                content.appendChild(dSub);

                const diagContainer = document.createElement('div');
                diagContainer.className = 'dialogue-cues-container';

                scene.dialogues.forEach(line => {
                    const dCard = document.createElement('div');
                    dCard.className = 'dialogue-card';

                    const tEl = document.createElement('div');
                    tEl.className = 'dialogue-card-text';
                    tEl.innerHTML = window.TBTextUtils.formatInlineMarkdown(line);

                    const btnSay = document.createElement('button');
                    btnSay.className = 'btn-say-in-chat';
                    btnSay.textContent = 'В чат';
                    btnSay.title = 'Отправить эту фразу в чат TaleSpire';
                    btnSay.onclick = () => {
                        const cleanLine = line.replace(/^[-*—_«»"]+|[-*—_«»"]+$/g, '').trim();
                        window.TBTextUtils.sendChatMessage(cleanLine, btnSay, 'Сказано', 'В чат');
                    };

                    dCard.appendChild(tEl);
                    dCard.appendChild(btnSay);
                    diagContainer.appendChild(dCard);
                });

                content.appendChild(diagContainer);
            }

            card.appendChild(content);
            return card;
        },

        /**
         * Renders Card 3: Checks & Tactics
         * @param {Object} scene 
         * @returns {HTMLElement}
         */
        renderMechanicsCard(scene) {
            const card = document.createElement('div');
            card.className = 'scene-section-card mechanics-card';

            const header = document.createElement('div');
            header.className = 'section-card-header';
            header.innerHTML = '<span class="section-card-title">Проверки навыков и тактика</span>';
            card.appendChild(header);

            const content = document.createElement('div');
            content.className = 'section-card-content';

            // Clues & Skill Checks
            if (scene.clues && scene.clues.length > 0) {
                const cluesContainer = document.createElement('div');
                cluesContainer.className = 'scene-clues-container';

                scene.clues.forEach(clue => {
                    const chip = document.createElement('div');
                    chip.className = 'clue-chip';
                    chip.innerHTML = window.TBTextUtils.formatDcBadges(clue);
                    cluesContainer.appendChild(chip);
                });

                content.appendChild(cluesContainer);
            }

            // Mechanics & Alerts
            if (scene.mechanics && scene.mechanics.length > 0) {
                const mechContainer = document.createElement('div');
                mechContainer.className = 'scene-mechanics-container';

                scene.mechanics.forEach(m => {
                    const mCard = document.createElement('div');
                    mCard.className = `mechanic-card ${m.type.toLowerCase()}`;

                    const mHead = document.createElement('div');
                    mHead.className = 'mechanic-title';
                    mHead.textContent = m.title || 'Механика';

                    const mBody = document.createElement('div');
                    mBody.className = 'mechanic-content';
                    mBody.innerHTML = window.TBTextUtils.formatInlineMarkdown(m.content);

                    mCard.appendChild(mHead);
                    mCard.appendChild(mBody);
                    mechContainer.appendChild(mCard);
                });

                content.appendChild(mechContainer);
            }

            card.appendChild(content);
            return card;
        },

        /**
         * Helper to find a target scene by link text, scene number, filename or title
         * @param {string} target 
         * @param {Array} allScenes 
         * @returns {Object|null}
         */
        findMatchingScene(target, allScenes = []) {
            if (!target) return null;
            const cleanTarget = target.split('#')[0].trim();
            const hashPart = target.includes('#') ? target.split('#')[1].trim() : '';

            const normalizeText = (str) => {
                return (str || '')
                    .toLowerCase()
                    .replace(/[«»"'\\.,:;—–\-_]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            const normTarget = normalizeText(cleanTarget);
            const targetNum = cleanTarget.match(/(?:сцена|scene)\s*(\d+)/i)?.[1] || 
                              hashPart.match(/(?:сцена|scene)\s*(\d+)/i)?.[1];

            for (const s of allScenes) {
                // 1. Direct scene number match (e.g. "Сцена 2" matches "scene-2" or "Сцена 2 - ...")
                const sNum = (s.title + ' ' + (s.file || '') + ' ' + (s.id || '')).match(/(?:сцена|scene)\s*(\d+)/i)?.[1] ||
                             (s.id || '').replace(/^scene-/, '');
                if (targetNum && sNum && targetNum === sNum) {
                    return s;
                }

                // 2. Exact or substring match against file or title
                const normTitle = normalizeText(s.title);
                const normFile = normalizeText(s.file);
                if (normTitle === normTarget || normFile === normTarget) return s;
                if (normTarget && (normTitle.includes(normTarget) || normTarget.includes(normTitle))) return s;
                if (normTarget && (normFile.includes(normTarget) || normTarget.includes(normFile))) return s;
            }
            return null;
        },

        /**
         * Renders Card 4: Non-Linear Branches & Emergency Nudge
         * @param {Object} scene 
         * @param {Array} allScenes 
         * @param {Object} options 
         * @returns {HTMLElement}
         */
        renderBranchesCard(scene, allScenes = [], options = {}) {
            const card = document.createElement('div');
            card.className = 'scene-section-card branches-card';

            const header = document.createElement('div');
            header.className = 'section-card-header';
            header.innerHTML = '<span class="section-card-title">Куда вести сюжет дальше (Развилки)</span>';
            card.appendChild(header);

            const content = document.createElement('div');
            content.className = 'section-card-content';

            if (scene.branches && scene.branches.length > 0) {
                const branchContainer = document.createElement('div');
                branchContainer.className = 'scene-branches-container';

                scene.branches.forEach(branch => {
                    const bCard = document.createElement('div');
                    bCard.className = 'branch-card';

                    // Detect scene link like [[Сцена 4...]] or [[Цех Переплавки]]
                    const linkMatch = branch.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
                    let targetScene = null;
                    if (linkMatch) {
                        targetScene = this.findMatchingScene(linkMatch[1], allScenes);
                    }

                    const textEl = document.createElement('div');
                    textEl.className = 'branch-text';
                    textEl.innerHTML = branch
                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                        .replace(/_([^_]+)_/g, '<i>$1</i>')
                        .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, target, label) => {
                            const display = label ? label.trim() : target.trim();
                            const matched = this.findMatchingScene(target, allScenes);
                            const sceneIdAttr = matched ? `data-scene-id="${matched.id}"` : '';
                            return `<a href="#" class="branch-scene-link" data-target="${target.trim()}" ${sceneIdAttr} title="Перейти к сцене: ${display}">${display}</a>`;
                        });

                    // Add click listener so clicking the link itself transitions to the scene
                    textEl.addEventListener('click', (e) => {
                        const link = e.target.closest('.branch-scene-link');
                        if (link) {
                            e.preventDefault();
                            e.stopPropagation();
                            const sceneId = link.dataset.sceneId;
                            if (sceneId && options.onSelectScene) {
                                options.onSelectScene(sceneId);
                            } else {
                                const target = link.dataset.target;
                                const found = this.findMatchingScene(target, allScenes);
                                if (found && options.onSelectScene) {
                                    options.onSelectScene(found.id);
                                }
                            }
                        }
                    });

                    bCard.appendChild(textEl);

                    // Direct 1-click scene jump button
                    if (targetScene) {
                        const btnJump = document.createElement('button');
                        btnJump.className = 'btn-jump-scene';
                        btnJump.innerHTML = `→ К сцене: <b>${targetScene.title}</b>`;
                        btnJump.onclick = () => {
                            if (options.onSelectScene) {
                                options.onSelectScene(targetScene.id);
                            }
                        };
                        bCard.appendChild(btnJump);
                    }

                    branchContainer.appendChild(bCard);
                });

                content.appendChild(branchContainer);
            }

            // Permanent GM Nudge Box
            if (scene.nudge) {
                const nudgeBox = document.createElement('div');
                nudgeBox.className = 'gm-nudge-box permanent';

                const nHead = document.createElement('div');
                nHead.className = 'gm-nudge-header';
                nHead.innerHTML = '<span class="gm-nudge-title">Пинок Мастера (если игроки застряли)</span>';

                const nText = document.createElement('div');
                nText.className = 'gm-nudge-text';
                nText.innerHTML = window.TBTextUtils.formatInlineMarkdown(scene.nudge);

                nudgeBox.appendChild(nHead);
                nudgeBox.appendChild(nText);
                content.appendChild(nudgeBox);
            }

            card.appendChild(content);
            return card;
        }
    };

    window.TBSceneCardRenderer = TBSceneCardRenderer;
})();
