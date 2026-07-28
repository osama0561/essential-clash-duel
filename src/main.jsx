import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Crown, RotateCcw, Swords, Zap } from 'lucide-react';
import './styles.css';

const LANES = [0, 1, 2];
const LANE_X = [110, 210, 310];
const PLAYER_Y = 636;
const ENEMY_Y = 84;
const MAX_TOWER_HP = 1200;
const KING_HP = 1700;
const MAX_ELIXIR = 10;
const ARENA = { w: 420, h: 720 };
const GIANT_FACE = new Image();
GIANT_FACE.src = '/giant-face.jpg';

const CARDS = [
  { id: 'guard', name: 'Shield Guard', cost: 2, hp: 155, dmg: 22, speed: 48, range: 22, rate: 0.9, icon: '🛡️', color: '#2563eb', role: 'tank' },
  { id: 'knight', name: 'Sword Knight', cost: 3, hp: 260, dmg: 32, speed: 38, range: 24, rate: 1.05, icon: '⚔️', color: '#f59e0b', role: 'melee' },
  { id: 'archer', name: 'Pink Archer', cost: 3, hp: 125, dmg: 24, speed: 34, range: 118, rate: 0.75, icon: '🏹', color: '#ec4899', role: 'ranged' },
  { id: 'giant', name: 'Osama Giant', cost: 5, hp: 560, dmg: 48, speed: 24, range: 28, rate: 1.25, icon: '🧔🏻', color: '#a16207', role: 'giant' },
  { id: 'spear', name: 'Spear Goblin', cost: 2, hp: 95, dmg: 18, speed: 58, range: 92, rate: 0.62, icon: '🟢', color: '#16a34a', role: 'spear' },
  { id: 'wizard', name: 'Fire Wizard', cost: 4, hp: 150, dmg: 42, speed: 30, range: 104, rate: 1.1, icon: '🔥', color: '#ef4444', role: 'wizard', splash: 34 },
  { id: 'mini', name: 'Mini Brute', cost: 4, hp: 340, dmg: 58, speed: 42, range: 24, rate: 1.15, icon: '💪', color: '#7c3aed', role: 'mini' },
  { id: 'barrel', name: 'Bomb Barrel', cost: 3, hp: 120, dmg: 72, speed: 50, range: 28, rate: 1.5, icon: '💣', color: '#78350f', role: 'barrel', deathDmg: 56 },
];

const DIFFICULTIES = {
  easy: { label: 'Easy', think: 2.5, elixir: 0.78, smart: 0.22, bonus: 0.9 },
  medium: { label: 'Medium', think: 1.65, elixir: 0.98, smart: 0.58, bonus: 1.0 },
  hard: { label: 'Hard', think: 0.95, elixir: 1.2, smart: 0.9, bonus: 1.12 },
};

function makeTower(owner, lane) {
  const isKing = lane === 1;
  return {
    id: `${owner}-tower-${lane}`,
    owner,
    lane,
    isKing,
    x: LANE_X[lane],
    y: owner === 'player' ? (isKing ? PLAYER_Y + 18 : PLAYER_Y - 16) : (isKing ? ENEMY_Y - 18 : ENEMY_Y + 16),
    hp: isKing ? KING_HP : MAX_TOWER_HP,
    maxHp: isKing ? KING_HP : MAX_TOWER_HP,
  };
}

function hpColor(pct) { return pct > 0.55 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444'; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function hp(ctx, x, y, value, max, width = 54) {
  const pct = Math.max(0, value / max);
  ctx.fillStyle = 'rgba(15,23,42,.9)'; rr(ctx, x - width / 2, y - 44, width, 8, 4);
  ctx.fillStyle = hpColor(pct); rr(ctx, x - width / 2 + 1, y - 43, Math.max(2, (width - 2) * pct), 6, 3);
}

function drawArena(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, ARENA.h);
  bg.addColorStop(0, '#266ed0'); bg.addColorStop(.09, '#60a5fa'); bg.addColorStop(.1, '#2c8f48'); bg.addColorStop(1, '#1f7a3a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, ARENA.w, ARENA.h);

  ctx.fillStyle = '#1e3a8a'; rr(ctx, 18, 12, 384, 48, 16);
  ctx.fillStyle = '#172554'; rr(ctx, 34, 24, 352, 24, 12);
  for (let x = 52; x < 382; x += 28) { ctx.fillStyle = ['#fde047', '#fb7185', '#93c5fd', '#86efac'][x % 4]; ctx.beginPath(); ctx.arc(x, 36, 5, 0, Math.PI * 2); ctx.fill(); }

  // lane roads and tile grid
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let x = 0; x < ARENA.w; x += 32) for (let y = 68; y < ARENA.h; y += 32) ctx.fillRect(x, y, 15, 15);
  for (const x of LANE_X) {
    ctx.fillStyle = 'rgba(191, 137, 72, .72)'; rr(ctx, x - 33, 76, 66, 568, 20);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let y = 105; y < 615; y += 48) rr(ctx, x - 4, y, 8, 23, 4);
  }

  // river + bridges across portrait battlefield
  const river = ctx.createLinearGradient(0, 330, 0, 390);
  river.addColorStop(0, '#38bdf8'); river.addColorStop(.5, '#0ea5e9'); river.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = river; rr(ctx, 20, 326, 380, 64, 20);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; for (let x = 36; x < 392; x += 42) { ctx.beginPath(); ctx.arc(x, 352, 15, 0, Math.PI); ctx.fill(); }
  for (const x of LANE_X) {
    ctx.fillStyle = '#7c4a21'; rr(ctx, x - 42, 318, 84, 80, 9);
    ctx.fillStyle = '#c0843f'; for (let y = 324; y < 392; y += 14) rr(ctx, x - 37, y, 74, 8, 4);
    ctx.strokeStyle = '#4a260f'; ctx.lineWidth = 3; ctx.strokeRect(x - 42, 319, 84, 78);
  }

  // side walls, flags, rocks
  ctx.fillStyle = '#475569'; rr(ctx, 8, 72, 16, 580, 8); rr(ctx, 396, 72, 16, 580, 8);
  for (let i = 0; i < 20; i++) {
    const x = 35 + (i * 61) % 350, y = 94 + (i * 89) % 540;
    ctx.fillStyle = i % 3 ? '#14532d' : '#64748b';
    ctx.beginPath(); ctx.ellipse(x, y, 8 + i % 4, 5 + i % 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  ['#2563eb', '#ef4444'].forEach((c, i) => { ctx.fillStyle = c; const y = i ? 666 : 70; for (const x of [54, 366]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y + (i ? -12 : 12)); ctx.lineTo(x, y + (i ? -24 : 24)); ctx.closePath(); ctx.fill(); } });
}

function drawTower(ctx, t) {
  const blue = t.owner === 'player';
  if (t.hp <= 0) ctx.globalAlpha = .28;
  ctx.save(); ctx.translate(t.x, t.y);
  const size = t.isKing ? 1.15 : .94;
  ctx.scale(size, size);
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 35, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = blue ? '#1d4ed8' : '#b91c1c'; rr(ctx, -25, -25, 50, 58, 9);
  ctx.fillStyle = blue ? '#60a5fa' : '#f87171'; rr(ctx, -19, -18, 38, 43, 7);
  ctx.fillStyle = '#7c4a21'; rr(ctx, -30, -40, 60, 20, 7);
  ctx.fillStyle = '#fde047'; for (let x = -22; x <= 22; x += 22) rr(ctx, x - 6, -53, 12, 16, 4);
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(-30, -40); ctx.lineTo(0, -61); ctx.lineTo(30, -40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#172554'; rr(ctx, -8, 4, 16, 29, 8);
  ctx.fillStyle = '#fff7ed'; ctx.font = '900 20px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.isKing ? '♛' : '★', 0, -23);
  ctx.restore(); hp(ctx, t.x, t.y, t.hp, t.maxHp, t.isKing ? 68 : 55); ctx.globalAlpha = 1;
}

function drawUnit(ctx, u) {
  const enemy = u.owner === 'enemy';
  ctx.save(); ctx.translate(u.x, u.y); ctx.scale(enemy ? -1 : 1, 1);
  const team = enemy ? '#dc2626' : '#2563eb';
  ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.beginPath(); ctx.ellipse(0, 24, u.role === 'giant' ? 29 : 21, 8, 0, 0, Math.PI * 2); ctx.fill();
  const face = '#f0b17a';
  const eyes = () => { ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(-5, -24, 2, 0, Math.PI*2); ctx.arc(6, -24, 2, 0, Math.PI*2); ctx.fill(); };

  if (u.role === 'giant') {
    ctx.fillStyle = '#7c3f17'; rr(ctx, -23, -10, 46, 45, 18);
    ctx.fillStyle = '#f8fafc'; rr(ctx, -28, -13, 56, 17, 8);
    ctx.strokeStyle = '#3f2a18'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(17, 5); ctx.lineTo(37, -5); ctx.stroke();
    ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.arc(42, -6, 10, 0, Math.PI*2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(0, -30, 25, 0, Math.PI * 2); ctx.clip();
    if (GIANT_FACE.complete) ctx.drawImage(GIANT_FACE, -25, -55, 50, 50);
    else { ctx.fillStyle = face; ctx.fillRect(-25, -55, 50, 50); }
    ctx.restore();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -30, 26, 0, Math.PI * 2); ctx.stroke();
  }
  else if (u.role === 'ranged') { ctx.fillStyle = '#7c2d12'; rr(ctx, -10, -1, 20, 29, 8); ctx.fillStyle = '#f9a8d4'; ctx.beginPath(); ctx.arc(0, -25, 15, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(0, -35, 17, Math.PI, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(16, -8, 23, -1.2, 1.2); ctx.stroke(); eyes(); }
  else if (u.role === 'wizard') { ctx.fillStyle = '#7f1d1d'; rr(ctx, -13, -3, 26, 34, 9); ctx.fillStyle = face; ctx.beginPath(); ctx.arc(0, -25, 14, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-17,-34); ctx.lineTo(0,-60); ctx.lineTo(17,-34); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(25, -8, 9, 0, Math.PI*2); ctx.fill(); eyes(); }
  else if (u.role === 'spear') { ctx.fillStyle = '#15803d'; rr(ctx, -10, 0, 20, 27, 8); ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.arc(0, -22, 13, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(11, -3); ctx.lineTo(37, -35); ctx.stroke(); ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(37,-35); ctx.lineTo(31,-24); ctx.lineTo(43,-27); ctx.closePath(); ctx.fill(); eyes(); }
  else if (u.role === 'barrel') { ctx.fillStyle = '#78350f'; rr(ctx, -16, -9, 32, 38, 8); ctx.fillStyle = '#f59e0b'; rr(ctx, -18, -3, 36, 8, 4); rr(ctx, -18, 17, 36, 8, 4); ctx.fillStyle = '#111827'; ctx.font = '900 18px Inter'; ctx.textAlign = 'center'; ctx.fillText('✹', 0, 13); }
  else if (u.role === 'mini') { ctx.fillStyle = '#6d28d9'; rr(ctx, -17, -8, 34, 39, 12); ctx.fillStyle = face; ctx.beginPath(); ctx.arc(0, -28, 17, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(15, 1); ctx.lineTo(37, -23); ctx.stroke(); eyes(); }
  else if (u.role === 'melee') { ctx.fillStyle = team; rr(ctx, -14, -3, 28, 33, 8); ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(0, -25, 16, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = team; rr(ctx, -14, -34, 28, 12, 5); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(34, -22); ctx.stroke(); eyes(); }
  else { ctx.fillStyle = team; rr(ctx, -13, -1, 26, 30, 8); ctx.fillStyle = face; ctx.beginPath(); ctx.arc(0, -23, 14, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#334155'; rr(ctx, -16, -37, 32, 13, 6); ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(20, -6, 13, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.stroke(); eyes(); }
  ctx.restore(); hp(ctx, u.x, u.y, u.hp, u.maxHp, u.role === 'giant' ? 58 : 45);
}

function App() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [selected, setSelected] = useState(CARDS[0]);
  const [snapshot, setSnapshot] = useState(null);
  const [banner, setBanner] = useState('Tap a card, then tap a lane on your half.');

  const newGame = () => {
    stateRef.current = { running: true, time: 0, playerElixir: 5, enemyElixir: 5, nextBot: 1.1, units: [], sparks: [], towers: [...LANES.map(l => makeTower('player', l)), ...LANES.map(l => makeTower('enemy', l))], winner: null, last: performance.now() };
    setBanner(`Portrait arena loaded: ${DIFFICULTIES[difficulty].label} bot`);
  };
  useEffect(() => { newGame(); }, [difficulty]);

  const deploy = (owner, card, lane) => {
    const s = stateRef.current, key = owner === 'player' ? 'playerElixir' : 'enemyElixir';
    if (!s.running || s[key] < card.cost) return false;
    const diff = DIFFICULTIES[difficulty];
    s[key] -= card.cost;
    s.units.push({ ...card, id: `${owner}-${card.id}-${Math.random().toString(36).slice(2)}`, owner, lane, x: LANE_X[lane], y: owner === 'player' ? PLAYER_Y - 74 : ENEMY_Y + 74, hp: card.hp * (owner === 'enemy' ? diff.bonus : 1), maxHp: card.hp * (owner === 'enemy' ? diff.bonus : 1), cd: Math.random() * .35 });
    return true;
  };

  const botPlay = (s) => {
    const diff = DIFFICULTIES[difficulty], affordable = CARDS.filter(c => c.cost <= s.enemyElixir);
    if (!affordable.length) return;
    let lane = Math.floor(Math.random() * 3);
    if (Math.random() < diff.smart) {
      const threats = LANES.map(l => ({ lane: l, pressure: s.units.filter(u => u.owner === 'player' && u.lane === l).reduce((a, u) => a + u.hp + u.dmg * 8, 0) })).sort((a,b)=>b.pressure-a.pressure);
      lane = threats[0].pressure > 0 ? threats[0].lane : s.towers.filter(t => t.owner === 'player' && t.hp > 0).sort((a,b)=>a.hp-b.hp)[0]?.lane ?? lane;
    }
    const hasThreat = s.units.some(u => u.owner === 'player' && u.lane === lane);
    const card = Math.random() < diff.smart ? affordable.sort((a,b)=> hasThreat ? b.hp - a.hp : b.dmg - a.dmg)[0] : affordable[Math.floor(Math.random() * affordable.length)];
    deploy('enemy', card, lane);
  };

  const damageSplash = (s, attacker, target) => {
    target.hp -= attacker.dmg;
    if (attacker.splash) s.units.filter(v => v.owner !== attacker.owner && v.lane === attacker.lane && v.hp > 0 && Math.abs(v.y - target.y) < attacker.splash).forEach(v => { if (v !== target) v.hp -= attacker.dmg * .45; });
    s.sparks.push({ x: target.x, y: target.y - 14, ttl: .32, txt: `-${Math.round(attacker.dmg)}` });
  };

  const tick = (dt) => {
    const s = stateRef.current;
    if (!s?.running) return;
    const diff = DIFFICULTIES[difficulty];
    s.time += dt; s.playerElixir = Math.min(MAX_ELIXIR, s.playerElixir + dt * .8); s.enemyElixir = Math.min(MAX_ELIXIR, s.enemyElixir + dt * .8 * diff.elixir);
    s.nextBot -= dt; if (s.nextBot <= 0) { botPlay(s); s.nextBot = diff.think + Math.random() * .7; }
    for (const u of s.units) {
      const dir = u.owner === 'player' ? -1 : 1;
      const enemies = s.units.filter(v => v.owner !== u.owner && v.lane === u.lane && v.hp > 0);
      const liveTowers = s.towers.filter(t => t.owner !== u.owner && t.lane === u.lane && t.hp > 0);
      const target = [...enemies, ...liveTowers].sort((a,b)=>Math.abs(a.y-u.y)-Math.abs(b.y-u.y))[0];
      if (target && Math.abs(target.y - u.y) <= u.range) { u.cd -= dt; if (u.cd <= 0) { damageSplash(s, u, target); u.cd = u.rate; } }
      else u.y += dir * u.speed * dt;
    }
    const dying = s.units.filter(u => u.hp <= 0 && u.deathDmg);
    for (const b of dying) [...s.units, ...s.towers].filter(v => v.owner !== b.owner && v.lane === b.lane && v.hp > 0 && Math.abs(v.y - b.y) < 44).forEach(v => { v.hp -= b.deathDmg; s.sparks.push({ x: v.x, y: v.y - 6, ttl: .35, txt: 'BOOM' }); });
    s.units = s.units.filter(u => u.hp > 0 && u.y > 24 && u.y < 696);
    s.sparks.forEach(p => { p.ttl -= dt; p.y -= dt * 18; }); s.sparks = s.sparks.filter(p => p.ttl > 0);
    const playerAlive = s.towers.some(t => t.owner === 'player' && t.hp > 0), enemyAlive = s.towers.some(t => t.owner === 'enemy' && t.hp > 0);
    if (!playerAlive || !enemyAlive) { s.running = false; s.winner = enemyAlive ? 'Bot wins' : 'You win'; setBanner(s.winner === 'You win' ? '🏆 You took the enemy arena!' : '💀 The bot won the arena.'); }
  };

  const draw = () => {
    const ctx = canvasRef.current.getContext('2d'), s = stateRef.current;
    ctx.clearRect(0, 0, ARENA.w, ARENA.h); drawArena(ctx); if (!s) return;
    [...s.towers].sort((a,b)=>a.y-b.y).forEach(t => drawTower(ctx, t)); [...s.units].sort((a,b)=>a.y-b.y).forEach(u => drawUnit(ctx, u));
    ctx.font = '900 14px Inter, sans-serif'; ctx.textAlign = 'center';
    for (const p of s.sparks) { ctx.fillStyle = `rgba(255,255,255,${p.ttl/.32})`; ctx.strokeStyle = `rgba(15,23,42,${p.ttl/.32})`; ctx.lineWidth = 3; ctx.strokeText(p.txt, p.x, p.y); ctx.fillText(p.txt, p.x, p.y); }
    if (s.winner) { ctx.fillStyle = 'rgba(0,0,0,.58)'; ctx.fillRect(0,0,ARENA.w,ARENA.h); ctx.fillStyle = '#fff'; ctx.font = '900 40px Inter'; ctx.fillText(s.winner, 210, 360); }
  };

  useEffect(() => { let raf; const loop = now => { const s = stateRef.current; if (s) { const dt = Math.min(.05, (now - s.last) / 1000 || 0); s.last = now; tick(dt); draw(); setSnapshot({ playerElixir: s.playerElixir, enemyElixir: s.enemyElixir, towers: s.towers.map(t => ({ id: t.id, hp: t.hp, maxHp: t.maxHp })), winner: s.winner }); } raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, [difficulty]);

  const handleCanvas = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (ARENA.w / rect.width);
    const y = (e.clientY - rect.top) * (ARENA.h / rect.height);
    if (y < 360) { setBanner('Deploy on your bottom half first.'); return; }
    const lane = LANE_X.map((lx, i) => ({ i, d: Math.abs(lx - x) })).sort((a,b)=>a.d-b.d)[0].i;
    const ok = deploy('player', selected, lane);
    setBanner(ok ? `Deployed ${selected.name} in lane ${lane + 1}` : 'Not enough elixir yet.');
  };

  const towerSummary = useMemo(() => { const s = stateRef.current; if (!s) return { player: 0, enemy: 0 }; return { player: s.towers.filter(t => t.owner === 'player' && t.hp > 0).length, enemy: s.towers.filter(t => t.owner === 'enemy' && t.hp > 0).length }; }, [snapshot]);

  return <main className="app portrait-app">
    <section className="panel topbar">
      <div><h1><Crown size={28}/> Essential Royale Duel</h1><p>Portrait arena, more cards, better cartoon units.</p></div>
      <div className="controls"><label>Bot tier<select value={difficulty} onChange={e => setDifficulty(e.target.value)}>{Object.entries(DIFFICULTIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></label><button onClick={newGame}><RotateCcw size={16}/> Restart</button></div>
    </section>
    <section className="hud"><div className="meter blue"><Zap size={17}/> Elixir <b>{Math.floor(snapshot?.playerElixir ?? 0)}</b></div><div className="banner">{banner}</div><div className="meter red"><Swords size={17}/> Towers {towerSummary.player} - {towerSummary.enemy}</div></section>
    <canvas ref={canvasRef} width={ARENA.w} height={ARENA.h} onClick={handleCanvas} />
    <section className="cards portrait-cards">{CARDS.map(card => <button key={card.id} onClick={() => setSelected(card)} className={selected.id === card.id ? 'selected' : ''} style={{'--card': card.color}}>{card.role === 'giant' ? <img className="card-photo" src="/giant-face-circle.png" alt="Osama Giant" /> : <span className="emoji">{card.icon}</span>}<b>{card.name}</b><small>{card.cost} elixir · {card.hp} hp · {card.dmg} dmg</small></button>)}</section>
    <p className="note">Original fan-made cartoon styling inspired by portrait lane/tower arena games; no copied Supercell art or assets.</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
