# BitGrid 64 — Retro PWA (stile C64 / ZX)

**Un rompicapo "Lights Out" minimale, con audio 8‑bit, CRT e palette Commodore 64 / ZX Spectrum.**  
Installabile su iOS e Android (PWA), offline-ready.

## Come si gioca
- Tocca una cella per invertire lei e le adiacenti (su/giù/sinistra/destra).
- Spegni tutte le celle per completare il livello.
- Tastiera: Frecce/WASD spostano il cursore, Invio/Spazio attiva.
- Mobile: pulsante **A** attiva, **B** genera un nuovo livello.

## Installazione
1. Metti i file su un hosting statico (o `localhost`).
2. iOS (Safari): **Condividi → Aggiungi a Home**. Android (Chrome): **Installa app**.
3. La prima volta apri online per permettere al service worker di mettere in cache i file.

## Struttura
```
/BitGrid64-PWA-v1
  index.html
  readme.html
  app.js
  sw.js
  manifest.webmanifest
  /assets
    icon-192.png
    icon-512.png
    maskable-192.png
    maskable-512.png
```

## Licenza
MIT © 2025 pezzaliAPP
