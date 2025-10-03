/* BitGrid 64 — v1.4 (©2025 pezzaliAPP, MIT)
 * Fix critici dalla v1.3:
 *  - header/hud/dpadBox/actBox mancanti -> ReferenceError
 *  - DPR dichiarato due volte -> SyntaxError
 *  - inizializzazione ordine fit() + scramble()
 * Altri:
 *  - visualViewport sizing (iOS), clamps e grid pixel-perfect
 */
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const lvlEl = document.getElementById('lvl');
  const movesEl = document.getElementById('moves');
  const targetEl = document.getElementById('target');
  const scoreEl = document.getElementById('score');
  const bestEl  = document.getElementById('best');
  const panel = document.getElementById('panel');
  const toast = document.getElementById('toast');

  const btnTheme = document.getElementById('btnTheme');
  const btnSound = document.getElementById('btnSound');
  const btnHelp  = document.getElementById('btnHelp');
  const btnStats = document.getElementById('btnStats');
  const btnShuffle = document.getElementById('btnShuffle');
  const btnCloseHelp = document.getElementById('btnCloseHelp');
  const panelStats = document.getElementById('panelStats');
  const btnCloseStats = document.getElementById('btnCloseStats');
  const statLevel = document.getElementById('statLevel');
  const statPar = document.getElementById('statPar');
  const statMoves = document.getElementById('statMoves');
  const statScore = document.getElementById('statScore');
  const statBest = document.getElementById('statBest');

  const dpad = {up:document.getElementById('up'),down:document.getElementById('down'),left:document.getElementById('left'),right:document.getElementById('right')};
  const actA = document.getElementById('actA');
  const actB = document.getElementById('actB');

  // MANCAVANO: usati in fit()
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
    score: parseInt(localStorage.getItem('bitgrid.score')||'0',10),
    best:  parseInt(localStorage.getItem('bitgrid.best')||'0',10),
    parSteps: 0,
    startT: 0,
  };

  function makeSolved(n){ return new Array(n*n).fill(0); }
  function idx(x,y){ return y*S.size + x; }
  function inb(x,y){ return x>=0 && x<S.size && y>=0 && y<S.size; }
  function toggleAt(g,x,y){
    const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy;
      if(inb(nx,ny)) grid[idx(nx,ny)] = 1 - grid[idx(nx,ny)];
    }
  }
  let grid = makeSolved(S.size);

  function scramble(steps=8){
    grid = makeSolved(S.size);
    const rnd = (m) => Math.floor(Math.random()*m);
    for(let i=0;i<steps;i++) toggleAt(grid, rnd(S.size), rnd(S.size));
    S.parSteps = steps;
    S.moves = 0; S.cursor={x:Math.floor(S.size/2), y:Math.floor(S.size/2)};
    S.startT = performance.now();
    updateHUD(); draw();
  }

  function updateHUD(){
    lvlEl.textContent = `Livello ${S.level}`;
    movesEl.textContent = S.moves;
    targetEl.textContent = "spente";
    if (scoreEl) scoreEl.textContent = S.score;
    if (bestEl)  bestEl.textContent  = S.best;
  }

  // --- Audio ---
  let audioCtx = null;
  const unlock = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      removeEventListener('pointerdown', unlock, true);
      removeEventListener('keydown', unlock, true);
    }
  };
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);

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

  // --- Drawing ---
  let DPR = 1;
  function draw(){
    const w = canvas.width / DPR, h = canvas.height / DPR;
    ctx.save();
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,w,h);

    const pad = 28, size = S.size, cellGap = S.cellPad;
    const available = Math.max(40, w - pad*2 - cellGap*(size-1));
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

        roundRect(ctx, cx, cy, cellSize, cellSize, 10, true, false, on ? palette[1] : '#0e1322');

        if (on){
          const g = ctx.createRadialGradient(cx+cellSize/2, cy+cellSize/2, 4, cx+cellSize/2, cy+cellSize/2, cellSize/1.2);
          g.addColorStop(0, palette[1] + 'cc'); g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.fillRect(cx-8, cy-8, cellSize+16, cellSize+16);
        }

        ctx.strokeStyle = '#1b2a3f'; ctx.lineWidth = 2;
        roundRect(ctx, cx, cy, cellSize, cellSize, 10, false, true);

        if (S.cursor.x===x && S.cursor.y===y){
          ctx.strokeStyle = palette[4]; ctx.lineWidth = 3;
          roundRect(ctx, cx-3, cy-3, cellSize+6, cellSize+6, 12, false, true);
        }
      }
    }
    for (let i=0;i<h;i+=4){ ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.fillRect(0,i,w,1); }
    ctx.restore();
  }

  function roundRect(ctx,x,y,w,h,r,fill,stroke,fillColor){
    if (typeof r==='number') r={tl:r,tr:r,br:r,bl:r};
    ctx.beginPath();
    ctx.moveTo(x+r.tl,y);
    ctx.lineTo(x+w-r.tr,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r.tr);
    ctx.lineTo(x+w,y+h-r.br);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r.br,y+h);
    ctx.lineTo(x+r.bl,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r.bl);
    ctx.lineTo(x,y+r.tl);
    ctx.quadraticCurveTo(x,y,x+r.tl,y);
    ctx.closePath();
    if (fill){ ctx.fillStyle = fillColor || '#0e1322'; ctx.fill(); }
    if (stroke) ctx.stroke();
  }

  // --- Input ---
  function activate(x,y){
    toggleAt(grid,x,y);
    S.moves++; updateHUD(); draw();
    beep(220, .06, 'square', .12); haptic(15);
    if (grid.every(v=>v===0)) win();
  }
  function win(){
    const timeSec = (performance.now() - S.startT)/1000;
    const base = 1000;
    const overPar = Math.max(0, S.moves - (S.parSteps||0));
    const movePenalty = 10 * overPar;
    const timeBonus = Math.max(0, Math.min(300, 300 - Math.floor(timeSec * 5)));
    const levelMult = 1 + (S.level - 1) * 0.05;
    const gained = Math.max(0, Math.round((base + timeBonus - movePenalty) * levelMult));
    S.score += gained;
    if (S.score > S.best) S.best = S.score;
    localStorage.setItem('bitgrid.score', String(S.score));
    localStorage.setItem('bitgrid.best',  String(S.best));
    toastMsg(`+${gained} punti`);

    toast.classList.add('show');
    beep(523.25,.08,'square',.18); setTimeout(()=>beep(659.25,.08,'square',.18),100); setTimeout(()=>beep(783.99,.1,'square',.2),200);
    haptic(30);
    setTimeout(()=>{ toast.classList.remove('show'); S.level++; localStorage.setItem('bitgrid.level', String(S.level)); scramble(Math.min(5 + S.level, 18)); updateHUD(); }, 900);
  }

  canvas.addEventListener('pointerdown', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left);
    const py = (e.clientY - rect.top);

    const w = canvas.width / DPR, h = canvas.height / DPR;
    const pad = 28, size = S.size, cellGap = S.cellPad;
    const available = Math.max(40, w - pad*2 - cellGap*(size-1));
    const cellSize = Math.floor(available / size);
    const total = cellSize*size + cellGap*(size-1);
    const ox = Math.floor((w - total)/2);
    const oy = ox;

    for (let y=0;y<size;y++){
      for (let x=0;x<size;x++){
        const cx = ox + x*(cellSize+cellGap);
        const cy = oy + y*(cellSize+cellGap);
        if (px>=cx && px<=cx+cellSize && py>=cy && py<=cy+cellSize){
          S.cursor={x,y}; activate(x,y); return;
        }
      }
    }
  });

  addEventListener('keydown', (e)=>{
    if (e.key==='ArrowUp'||e.key==='w'||e.key==='W'){ S.cursor.y = Math.max(0, S.cursor.y-1); draw(); }
    else if (e.key==='ArrowDown'||e.key==='s'||e.key==='S'){ S.cursor.y = Math.min(S.size-1, S.cursor.y+1); draw(); }
    else if (e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){ S.cursor.x = Math.max(0, S.cursor.x-1); draw(); }
    else if (e.key==='ArrowRight'||e.key==='d'||e.key==='D'){ S.cursor.x = Math.min(S.size-1, S.cursor.x+1); draw(); }
    else if (e.key===' '|| e.key==='Enter'){ activate(S.cursor.x, S.cursor.y); }
    else if (e.key==='h'){ panel.style.display = panel.style.display==='flex' ? 'none' : 'flex'; }
  });

  dpad.up.addEventListener('pointerdown', ()=>{ S.cursor.y=Math.max(0,S.cursor.y-1); draw(); });
  dpad.down.addEventListener('pointerdown', ()=>{ S.cursor.y=Math.min(S.size-1,S.cursor.y+1); draw(); });
  dpad.left.addEventListener('pointerdown', ()=>{ S.cursor.x=Math.max(0,S.cursor.x-1); draw(); });
  dpad.right.addEventListener('pointerdown', ()=>{ S.cursor.x=Math.min(S.size-1,S.cursor.x+1); draw(); });
  actA.addEventListener('pointerdown', ()=>activate(S.cursor.x,S.cursor.y));
  actB.addEventListener('pointerdown', ()=>scramble(Math.min(5 + S.level, 18)));

  btnTheme.addEventListener('click', ()=>{
    S.theme = (S.theme==='c64') ? 'zx' : 'c64';
    localStorage.setItem('bitgrid.theme', S.theme);
    toastMsg(S.theme==='c64' ? 'Palette Commodore 64' : 'Palette ZX Spectrum'); draw();
  });
  btnSound.addEventListener('click', ()=>{
    S.sound = !S.sound;
    localStorage.setItem('bitgrid.sound', S.sound ? 'on':'off');
    btnSound.textContent = S.sound ? '🔊' : '🔇';
    btnSound.setAttribute('aria-label', S.sound ? 'Audio attivo' : 'Audio disattivo');
    toastMsg(S.sound ? 'Audio attivo' : 'Audio muto');
  });
  btnHelp.addEventListener('click', ()=>{ panel.style.display = 'flex'; });
  btnCloseHelp?.addEventListener('click', ()=>{ panel.style.display = 'none'; });
  panel.addEventListener('click', (e)=>{ if(e.target === panel) panel.style.display = 'none'; });
  addEventListener('keydown', (e)=>{ if(e.key==='Escape' && panel.style.display==='flex') panel.style.display='none'; });
  btnShuffle.addEventListener('click', ()=>scramble(Math.min(5 + S.level, 18)));
  btnStats?.addEventListener('click', openStats);
  btnCloseStats?.addEventListener('click', ()=>{ if(panelStats) panelStats.style.display='none'; });
  panelStats?.addEventListener('click', (e)=>{ if(e.target===panelStats) panelStats.style.display='none'; });
  addEventListener('keydown', (e)=>{ if(e.key==='Escape' && panelStats && panelStats.style.display==='flex') panelStats.style.display='none'; });

  
  function openStats(){
    if (!panelStats) return;
    if (statLevel) statLevel.textContent = S.level;
    if (statPar)   statPar.textContent   = (S.parSteps ?? '—');
    if (statMoves) statMoves.textContent = S.moves;
    if (statScore) statScore.textContent = S.score ?? 0;
    if (statBest)  statBest.textContent  = S.best ?? 0;
    panelStats.style.display = 'flex';
  }

  function toastMsg(s){
    toast.textContent = s;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>toast.classList.remove('show'), 1100);
  }

  // --- Fit using visualViewport for iOS
  function fit(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    DPR = dpr;
    const vw = window.innerWidth;
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;

    const headerH = header?.offsetHeight || 56;
    const controlsH = Math.max(dpadBox?.offsetHeight || 120, actBox?.offsetHeight || 120);
    const hudH = hud?.offsetHeight || 38;

    const reserved = headerH + controlsH + hudH + 64;
    let cssSize = Math.floor(Math.min(vw*0.96, vh - reserved));
    if (!isFinite(cssSize) || cssSize < 200) cssSize = Math.floor(Math.min(vw*0.96, vh*0.60));

    hud.style.bottom = `${(controlsH + 20)}px`;

    canvas.style.width = cssSize+'px';
    canvas.style.height= cssSize+'px';
    canvas.width = Math.floor(cssSize * dpr);
    canvas.height= Math.floor(cssSize * dpr);

    draw();
  }
  addEventListener('resize', fit);
  addEventListener('orientationchange', fit);

  // Ordine corretto di bootstrap
  fit();                  // dimensiona il canvas
  scramble(S.level + 3);  // genera il livello e disegna
})();