/* BitGrid 64 — v1.2 (©2025 pezzaliAPP, MIT)
 * - Celle pixel-perfect (niente bordi spezzati)
 * - Pulsanti etichettati (D-Pad ▲▼◀▶, A/B)
 * - Tutorial al primo avvio
 */
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const lvlEl = document.getElementById('lvl');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const panel = document.getElementById('panel');
  const toast = document.getElementById('toast');
  const tut = document.getElementById('tut');
  const tutStart = document.getElementById('tutStart');
  const tutSkip = document.getElementById('tutSkip');

  const btnTheme = document.getElementById('btnTheme');
  const btnSound = document.getElementById('btnSound');
  const btnHelp  = document.getElementById('btnHelp');
  const btnShuffle = document.getElementById('btnShuffle');

  const dpad = {up:document.getElementById('up'),down:document.getElementById('down'),left:document.getElementById('left'),right:document.getElementById('right')};
  const actA = document.getElementById('actA');
  const actB = document.getElementById('actB');

  const header = document.querySelector('header');
  const hud = document.querySelector('.hud');
  const dpadBox = document.querySelector('.dpad');
  const actBox = document.querySelector('.act');

  // --- Settings ---
  const S = {
    size: 5,
    cellPad: 6,
    theme: localStorage.getItem('bitgrid.theme') || 'c64',
    sound: localStorage.getItem('bitgrid.sound') !== 'off',
    level: parseInt(localStorage.getItem('bitgrid.level')||'1',10),
    moves: 0,
    cursor: {x:0,y:0},
  };

  let grid = makeSolved(S.size);
  scramble(S.level + 3);

  // --- Audio (unlocked on first user gesture) ---
  let audioCtx = null;
  const unlock = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  function beep(freq=440, dur=0.06, type='square', vol=0.12) {
    if (!S.sound || !audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }
  function haptic(ms=12){ if (navigator.vibrate) try{ navigator.vibrate(ms); }catch(e){} }

  // --- Utilities ---
  function makeSolved(n){ return new Array(n*n).fill(0); }
  function idx(x,y){ return y*S.size + x; }
  function inb(x,y){ return x>=0 && x<S.size && y>=0 && y<S.size; }
  function toggleAt(g,x,y){
    const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy;
      if(inb(nx,ny)) g[idx(nx,ny)] = 1 - g[idx(nx,ny)];
    }
  }
  function isSolved(g){ return g.every(v => v===0); }

  function scramble(steps=8){
    grid = makeSolved(S.size);
    const rnd = (m) => Math.floor(Math.random()*m);
    for(let i=0;i<steps;i++){
      toggleAt(grid, rnd(S.size), rnd(S.size));
    }
    S.moves = 0; S.cursor={x:Math.floor(S.size/2), y:Math.floor(S.size/2)};
    updateHUD();
    draw();
  }

  function updateHUD(){
    lvlEl.textContent = `Livello ${S.level}`;
    movesEl.textContent = S.moves;
    targetEl.textContent = "spente";
  }

  // --- Drawing ---
  let DPR = 1;
  function logicalSize(){ return {w: canvas.width / DPR, h: canvas.height / DPR}; }

  function draw(){
    const {w, h} = logicalSize();
    ctx.save();
    ctx.setTransform(DPR,0,0,DPR,0,0); // ensure logical units
    ctx.clearRect(0,0,w,h);

    const pad = 28;
    const size = S.size;
    const cellGap = S.cellPad;

    // compute integer cell size to avoid half pixels
    const available = w - pad*2 - cellGap*(size-1);
    const cellSize = Math.floor(available / size);
    const total = cellSize*size + cellGap*(size-1);
    const ox = Math.floor((w - total)/2);
    const oy = ox;

    const palette = (S.theme==='c64')
      ? ['#0b0f1a','#64ffff','#73ae58','#b86962','#40318d']
      : ['#000','#2aff2a','#ff2a2a','#2a2aff','#ffff2a'];

    ctx.fillStyle = '#060912';
    ctx.fillRect(0,0,w,h);

    for (let y=0;y<size;y++){
      for (let x=0;x<size;x++){
        const on = grid[idx(x,y)]===1;
        const cx = ox + x*(cellSize+cellGap);
        const cy = oy + y*(cellSize+cellGap);

        ctx.fillStyle = on ? palette[1] : '#0e1322';
        roundRect(ctx, cx, cy, cellSize, cellSize, 10, true, false);

        if (on){
          const g = ctx.createRadialGradient(cx+cellSize/2, cy+cellSize/2, 4, cx+cellSize/2, cy+cellSize/2, cellSize/1.2);
          g.addColorStop(0, palette[1] + 'cc');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fillRect(cx-8, cy-8, cellSize+16, cellSize+16);
        }

        ctx.strokeStyle = '#1b2a3f';
        ctx.lineWidth = 2;
        roundRect(ctx, cx, cy, cellSize, cellSize, 10, false, true);

        if (S.cursor.x===x && S.cursor.y===y){
          ctx.strokeStyle = palette[4];
          ctx.lineWidth = 3;
          roundRect(ctx, cx-3, cy-3, cellSize+6, cellSize+6, 12, false, true);
        }
      }
    }

    for (let i=0;i<h;i+=4){
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0,i,w,1);
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'number') r = {tl:r, tr:r, br:r, bl:r};
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // --- Input ---
  function activate(x,y){
    toggleAt(grid,x,y);
    S.moves++; updateHUD(); draw();
    beep(220, .06, 'square', .12);
    haptic(15);
    if (isSolved(grid)){ win(); }
  }
  function win(){
    toast.classList.add('show');
    beep(523.25,.08,'square',.18); setTimeout(()=>beep(659.25,.08,'square',.18),100); setTimeout(()=>beep(783.99,.1,'square',.2),200);
    haptic(30);
    setTimeout(()=>{
      toast.classList.remove('show');
      S.level++; localStorage.setItem('bitgrid.level', String(S.level));
      scramble(Math.min(5 + S.level, 18));
    }, 900);
  }

  canvas.addEventListener('pointerdown', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left);
    const py = (e.clientY - rect.top);

    // use logical coordinates
    const {w, h} = logicalSize();
    const pad = 28;
    const size = S.size;
    const cellGap = S.cellPad;
    const available = w - pad*2 - cellGap*(size-1);
    const cellSize = Math.floor(available / size);
    const total = cellSize*size + cellGap*(size-1);
    const ox = Math.floor((w - total)/2);
    const oy = ox;

    for (let y=0;y<size;y++){
      for (let x=0;x<size;x++){
        const cx = ox + x*(cellSize+cellGap);
        const cy = oy + y*(cellSize+cellGap);
        if (px>=cx && px<=cx+cellSize && py>=cy && py<=cy+cellSize){
          S.cursor={x,y};
          activate(x,y);
          return;
        }
      }
    }
  });

  document.addEventListener('keydown', (e)=>{
    if (e.key==='ArrowUp'||e.key==='w'||e.key==='W'){ S.cursor.y = Math.max(0, S.cursor.y-1); draw(); }
    else if (e.key==='ArrowDown'||e.key==='s'||e.key==='S'){ S.cursor.y = Math.min(S.size-1, S.cursor.y+1); draw(); }
    else if (e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){ S.cursor.x = Math.max(0, S.cursor.x-1); draw(); }
    else if (e.key==='ArrowRight'||e.key==='d'||e.key==='D'){ S.cursor.x = Math.min(S.size-1, S.cursor.x+1); draw(); }
    else if (e.key===' '|| e.key==='Enter'){ activate(S.cursor.x, S.cursor.y); }
    else if (e.key==='h'){ toggleHelp(); }
  });

  dpad.up.addEventListener('pointerdown', ()=>{ S.cursor.y=Math.max(0,S.cursor.y-1); draw(); });
  dpad.down.addEventListener('pointerdown', ()=>{ S.cursor.y=Math.min(S.size-1,S.cursor.y+1); draw(); });
  dpad.left.addEventListener('pointerdown', ()=>{ S.cursor.x=Math.max(0,S.cursor.x-1); draw(); });
  dpad.right.addEventListener('pointerdown', ()=>{ S.cursor.x=Math.min(S.size-1,S.cursor.x+1); draw(); });

  actA.addEventListener('pointerdown', ()=>activate(S.cursor.x,S.cursor.y));
  actB.addEventListener('pointerdown', ()=>scramble(Math.min(5 + S.level, 18)));

  // --- UI buttons ---
  btnTheme.addEventListener('click', ()=>{
    S.theme = (S.theme==='c64') ? 'zx' : 'c64';
    localStorage.setItem('bitgrid.theme', S.theme);
    toastMsg(S.theme==='c64' ? 'Palette Commodore 64' : 'Palette ZX Spectrum');
    draw();
  });
  btnSound.addEventListener('click', ()=>{
    S.sound = !S.sound;
    localStorage.setItem('bitgrid.sound', S.sound ? 'on':'off');
    toastMsg(S.sound ? 'Audio attivo' : 'Audio muto');
  });
  btnHelp.addEventListener('click', toggleHelp);
  btnShuffle.addEventListener('click', ()=>scramble(Math.min(5 + S.level, 18)));

  function toggleHelp(){
    panel.style.display = panel.style.display==='flex' ? 'none' : 'flex';
    if (panel.style.display==='flex') panel.focus();
  }

  function toastMsg(s){
    toast.textContent = s;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>toast.classList.remove('show'), 1100);
  }

  // Layout fit with DPR
  function fit(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    DPR = dpr;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const headerH = header?.offsetHeight || 56;
    const controlsH = Math.max(dpadBox?.offsetHeight || 120, actBox?.offsetHeight || 120);
    const hudH = hud?.offsetHeight || 38;
    const safePad = 24; // extra breathing

    const available = vh - headerH - controlsH - hudH - safePad*2;
    const cssSize = Math.max(200, Math.min(560, vw*0.92, available));

    hud.style.bottom = `${(controlsH + 24)}px`;

    canvas.style.width = cssSize+'px';
    canvas.style.height= cssSize+'px';
    canvas.width = Math.floor(cssSize * dpr);
    canvas.height= Math.floor(cssSize * dpr);

    draw();
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  setTimeout(fit, 0);

  // --- Tutorial ---
  const done = localStorage.getItem('bitgrid.tutorialDone') === '1';
  if (!done) tut.style.display = 'flex';
  function closeTut(){
    tut.style.display = 'none';
    localStorage.setItem('bitgrid.tutorialDone','1');
  }
  tutStart?.addEventListener('click', closeTut);
  tutSkip?.addEventListener('click', closeTut);
})();