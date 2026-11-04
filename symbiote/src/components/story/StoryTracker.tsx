import React, { useState, useEffect } from 'react';
import { useStoryStore } from '../../store/useStoryStore';
import { wsBridge } from '../../api/websocket';

export const StoryTracker: React.FC = () => {
  const { scenes, activeScene, sceneHistory, setActiveScene, goToScene, goBack } = useStoryStore();
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [mode, setMode] = useState<'all' | 'readAloud' | 'roleplay' | 'mechanics' | 'branches'>('all');
  const [isRotating, setIsRotating] = useState(false);

  // Number hotkeys 1-5 for modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') setMode('all');
      else if (e.key === '2') setMode('readAloud');
      else if (e.key === '3') setMode('roleplay');
      else if (e.key === '4') setMode('mechanics');
      else if (e.key === '5') setMode('branches');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCatalog = scenes.filter((s) => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.location && s.location.toLowerCase().includes(q)) ||
      (s.target && s.target.toLowerCase().includes(q))
    );
  });

  const handleRefreshScenes = () => {
    setIsRotating(true);
    wsBridge.send('GET_SCENES', {});
    setTimeout(() => setIsRotating(false), 700);
  };

  return (
    <div className="story-container">
      <div className="scene-nav-header">
        <button
          type="button"
          id="btnSceneHistoryBack"
          className="btn-scene-history"
          disabled={sceneHistory.length === 0}
          onClick={goBack}
          title="Вернуться к предыдущей сцене"
        >
          ◂ Назад
        </button>

        <div
          className="scene-active-pill"
          onClick={() => setShowCatalog(!showCatalog)}
          title="Открыть полный каталог сцен"
        >
          <span className="active-scene-badge">Сцена</span>
          <span className="active-scene-title">
            {activeScene ? activeScene.title : 'Выберите сцену из каталога'}
          </span>
          <span className="scene-dropdown-badge">Каталог ▾</span>
        </div>

        <button
          type="button"
          className={`btn-reload-scenes ${isRotating ? 'rotating' : ''}`}
          onClick={handleRefreshScenes}
          title="Обновить сцены из Obsidian"
        >
          ⟳
        </button>
      </div>

      {showCatalog && (
        <div className="scene-directory-drawer">
          <div className="scene-directory-header">
            <div className="scene-directory-title">
              Каталог сцен ({scenes.length})
            </div>
            <button
              type="button"
              className="btn-close-drawer"
              onClick={() => setShowCatalog(false)}
            >
              ✕
            </button>
          </div>
          <div className="scene-directory-search">
            <input
              type="text"
              placeholder="Поиск по названию, локации или NPC..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="scene-directory-list">
            {filteredCatalog.length === 0 ? (
              <div className="empty-hint">Сцены не найдены</div>
            ) : (
              filteredCatalog.map((s) => (
                <div
                  key={s.id}
                  className={`scene-directory-item ${activeScene?.id === s.id ? 'active' : ''}`}
                  onClick={() => {
                    goToScene(s.id);
                    setShowCatalog(false);
                  }}
                >
                  <div className="scene-item-title">{s.title}</div>
                  {s.location && <div className="scene-item-meta">{s.location}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="scene-mode-bar">
        <button
          type="button"
          className={`scene-mode-btn ${mode === 'all' ? 'active' : ''}`}
          onClick={() => setMode('all')}
        >
          <span className="key-hint">1</span> Все
        </button>
        <button
          type="button"
          className={`scene-mode-btn ${mode === 'readAloud' ? 'active' : ''}`}
          onClick={() => setMode('readAloud')}
        >
          <span className="key-hint">2</span> Зачитка
        </button>
        <button
          type="button"
          className={`scene-mode-btn ${mode === 'roleplay' ? 'active' : ''}`}
          onClick={() => setMode('roleplay')}
        >
          <span className="key-hint">3</span> Отыгрыш
        </button>
        <button
          type="button"
          className={`scene-mode-btn ${mode === 'mechanics' ? 'active' : ''}`}
          onClick={() => setMode('mechanics')}
        >
          <span className="key-hint">4</span> Проверки
        </button>
        <button
          type="button"
          className={`scene-mode-btn ${mode === 'branches' ? 'active' : ''}`}
          onClick={() => setMode('branches')}
        >
          <span className="key-hint">5</span> Развилки
        </button>
      </div>

      <div className="scene-body">
        {!activeScene ? (
          <div className="empty-hint">Выберите сцену из каталога</div>
        ) : (
          <div className="scene-detail-content">
            {(mode === 'all' || mode === 'readAloud') && activeScene.readAloud && activeScene.readAloud.length > 0 && (
              <div className="scene-block read-aloud-block">
                <div className="scene-block-title">Текст для зачитки игрокам:</div>
                {activeScene.readAloud.map((text, idx) => (
                  <blockquote key={idx} className="read-aloud-quote">
                    {text}
                  </blockquote>
                ))}
              </div>
            )}

            {(mode === 'all' || mode === 'roleplay') && activeScene.roleplay && activeScene.roleplay.length > 0 && (
              <div className="scene-block roleplay-block">
                <div className="scene-block-title">Подсказки для отыгрыша:</div>
                <ul>
                  {activeScene.roleplay.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {(mode === 'all' || mode === 'mechanics') && activeScene.checks && activeScene.checks.length > 0 && (
              <div className="scene-block checks-block">
                <div className="scene-block-title">Проверки характеристик:</div>
                <div className="checks-grid">
                  {activeScene.checks.map((c, idx) => (
                    <div key={idx} className="check-card">
                      <div className="check-card-header">
                        <strong>{c.skill}</strong> (СЛ {c.dc})
                      </div>
                      <div className="check-outcome success">✓ {c.success}</div>
                      <div className="check-outcome fail">✕ {c.fail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(mode === 'all' || mode === 'branches') && activeScene.branches && activeScene.branches.length > 0 && (
              <div className="scene-block branches-block">
                <div className="scene-block-title">Сюжетные развилки:</div>
                <div className="branches-list">
                  {activeScene.branches.map((b, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="branch-choice-btn"
                      onClick={() => {
                        const target = scenes.find((s) => s.title.toLowerCase() === b.targetScene.toLowerCase());
                        if (target) goToScene(target.id);
                      }}
                    >
                      <span>▸ {b.choice}</span>
                      <span className="branch-target-hint">→ {b.targetScene}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
