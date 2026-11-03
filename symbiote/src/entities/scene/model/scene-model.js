// --- FSD: Entities Layer - Scene Model ---

(function() {
    const TBSceneModel = {
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

            for (const s of (allScenes || [])) {
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
         * Groups scenes by their session folder name
         * @param {Array} scenes 
         * @returns {Object.<string, Array>}
         */
        groupBySession(scenes = []) {
            const groups = {};
            (scenes || []).forEach(sc => {
                const sName = sc.session || 'Общий сюжет';
                if (!groups[sName]) groups[sName] = [];
                groups[sName].push(sc);
            });
            return groups;
        }
    };

    window.TBSceneModel = TBSceneModel;
    window.TBEntities = window.TBEntities || {};
    window.TBEntities.sceneModel = TBSceneModel;
})();
