# TaleBridge Symbiote

Official bridge between TaleSpire and Obsidian for D&D 5e Game Masters and Players.
Connects to local Obsidian WebSocket server at `ws://127.0.0.1:30123`.

## Architecture (Feature-Sliced Design - FSD)

The Symbiote client is decomposed into strict FSD layers:

```
src/
├── app/                  # Application bootstrap & composition root
│   └── main.js
├── pages/                # Root screen controllers
│   ├── gm-screen/        # GM Screen page
│   └── player-screen/    # Player Screen page
├── widgets/              # Composite UI blocks
│   ├── app-header/       # Role toggle, scale, auto-inspect & status
│   ├── token-hud/        # Active miniature token HUD (GM only)
│   ├── cinema-overlay/   # Fullscreen media handout & manuscript showcase
│   ├── player-cockpit/   # Player sheet, inventory, notes, clues container
│   ├── story-tracker/    # Narrative flow, drawer, non-linear scene navigation
│   ├── character-roster/ # Character scrollbox, pinned quick bar & filters
│   ├── note-viewer/      # In-game Obsidian markdown reader & wiki-link navigator
│   └── tools-panel/      # Technical synchronization panel & event logger
├── features/             # Interactive user actions & flows
│   ├── apply-damage/     # Quick HP modification & health bar reactivity
│   ├── manage-inventory/ # Add item, equip toggle, qty modifiers, 2-step deletion
│   ├── save-notes/       # Personal notes editor, formatting toolbar, auto-save debounce
│   ├── archive-clues/    # Handout saving, 2-step deletion & archive grid
│   ├── broadcast-media/  # GM media broadcast form, public/ gallery picker, dismiss
│   ├── roll-dice/        # Formula sanitizing, TaleSpire 3D dice tray integration
│   └── gm-auth/          # Server authentication modal
├── entities/             # Business models & domain UI cards
│   ├── character/        # Character model, ability cell, attack card, roster card
│   ├── inventory-item/   # Inventory weight calculations, item card
│   ├── clue/             # Clue model, URL resolver, clue card
│   └── scene/            # Scene matching, session grouping, scene card renderer
└── shared/               # Reusable infrastructure & primitives
    ├── api/              # TaleSpire driver & WebSocket client
    ├── lib/              # Reactive store, clipboard manager, text-utils, logger
    └── config/           # Port definitions, storage keys, roles & defaults
```
