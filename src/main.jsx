import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Crown, RotateCcw, Swords, Zap } from 'lucide-react';
import './styles.css';

const LANES = [0, 1, 2];
const LANE_Y = [138, 252, 366];
const PLAYER_X = 88;
const ENEMY_X = 812;
const MAX_TOWER_HP = 1200;
const MAX_ELIXIR = 10;

const CARDS = [
  { id: 'guard', name: 'Shield Guard', cost: 2, hp: 155, dmg: 22, speed: 44, range: 20, rate: 0.9, emoji: '🛡️', color: '#3b82f6', armor: '#7dd3fc' },
  { id: 'knight', name: 'Sword Knight', cost: 3, hp: 260, dmg: 32, speed: 35, range: 22, rate: 1.05, emoji: '⚔️', color: '#f59e0b', armor: '#fcd34d' },
  { id: 'archer', name: 'Pink Archer', cost: 3, hp: 125, dmg: 24, speed: 32, range: 118, rate: 0.75, emoji: '🏹', color: '#ec4899', armor: '#f9a8d4' },
  { id: 'giant', name: 'Stone Brute', cost: 5, hp: 520, dmg: 46, speed: 22, range: 26, rate: 1.25, emoji: '🪨', color: '#a16207', armor: '#d6d3d1' },
];

const DIFFICULTIES = {
  easy: { label: 'Easy', think: 2.6, elixir: 0.78, smart: 0.2, bonus: 0.9 },
  medium: { label: 'Medium', think: 1.75, elixir: 0.98, smart: 0.58, bonus: 1.0 },
  hard: { label: 'Hard', think: 1.05, elixir: 1.2, smart: 0.9, bonus: 1.1 },
};

function makeTower(owner, lane) {
  return { id: `${owner}-tower-${lane}`, owner, lane, x: owner === 'player' ? PLAYER_X : ENEMY_X, y: LANE_Y[lane], hp: MAX_TOWER_HP, maxHp: MAX_TOWER_HP };
}

function hpColor(pct) {
  if (pct > 0.55) return '#22c55e';
  if (pct > 0.25) return '#f59e0b';
  return '#ef4444';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawHP(ctx, x, y, hp, max, width = 64) {
  const pct = Math.max(0, hp / max);
  ctx.fillStyle = 'rgba(15, 23, 42, .88)';
  roundRect(ctx, x - width / 2, y - 48, width, 8, 4);
  ctx.fillStyle = hpColor(pct);
  roundRect(ctx, x - width / 2 + 1, y - 47, Math.max(2, (width - 2) * pct), 6, 3);
}

function drawArena(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, 504);
  sky.addColorStop(0, '#72c2f6');
  sky.addColorStop(0.35, '#89d1fd');
  sky.addColorStop(0.36, '#3e8d41');
  sky.addColorStop(1, '#1f6f38');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 900, 504);

  // Spectator stands and banners: original cartoon arena mood, no copied assets.
  ctx.fillStyle = '#1e3a8a';
  roundRect(ctx, 18, 24, 864, 58, 18);
  ctx.fillStyle = '#0f172a';
  for (let x = 48; x < 860; x += 38) {
    ctx.beginPath(); ctx.arc(x, 54, 7, 0, Math.PI * 2); ctx.fill();
  }
  ['#2563eb', '#facc15', '#ef4444', '#22c55e'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(180 + i * 140, 80); ctx.lineTo(220 + i * 140, 80); ctx.lineTo(200 + i * 140, 112); ctx.closePath(); ctx.fill();
  });

  // Two sides of the battlefield.
  ctx.fillStyle = '#2f8f46'; ctx.fillRect(0, 94, 450, 410);
  ctx.fillStyle = '#34864b'; ctx.fillRect(450, 94, 450, 410);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let x = 0; x < 900; x += 42) for (let y = 98; y < 500; y += 42) ctx.fillRect(x, y, 22, 22);

  // Stone river with two bridges.
  const river = ctx.createLinearGradient(420, 0, 480, 0);
  river.addColorStop(0, '#38bdf8'); river.addColorStop(0.5, '#0ea5e9'); river.addColorStop(1, '#2563eb');
  ctx.fillStyle = river;
  roundRect(ctx, 421, 94, 58, 410, 22);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  for (let y = 112; y < 500; y += 34) { ctx.beginPath(); ctx.arc(445, y, 16, 0, Math.PI); ctx.fill(); }
  [170, 332].forEach(y => {
    ctx.fillStyle = '#9a6a36'; roundRect(ctx, 384, y - 25, 132, 50, 10);
    ctx.fillStyle = '#c08a4c'; for (let x = 396; x < 510; x += 24) roundRect(ctx, x, y - 22, 12, 44, 3);
    ctx.strokeStyle = '#5b341a'; ctx.lineWidth = 3; ctx.strokeRect(386, y - 24, 128, 48);
  });

  // Lane roads.
  for (const y of LANE_Y) {
    ctx.fillStyle = 'rgba(180, 134, 75, .62)';
    roundRect(ctx, 114, y - 30, 672, 60, 18);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let x = 142; x < 760; x += 50) roundRect(ctx, x, y - 4, 24, 8, 4);
  }

  // Decorative rocks and shrubs.
  for (let i = 0; i < 16; i++) {
    const x = 35 + (i * 53) % 825;
    const y = 112 + (i * 97) % 365;
    ctx.fillStyle = i % 2 ? '#14532d' : '#64748b';
    ctx.beginPath(); ctx.ellipse(x, y, 10 + (i % 3) * 3, 7 + (i % 2) * 4, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTower(ctx, t) {
  const blue = t.owner === 'player';
  if (t.hp <= 0) ctx.globalAlpha = .35;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(0, 39, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = blue ? '#1d4ed8' : '#b91c1c';
  roundRect(ctx, -32, -28, 64, 66, 10);
  ctx.fillStyle = blue ? '#60a5fa' : '#f87171';
  roundRect(ctx, -25, -22, 50, 52, 8);
  ctx.fillStyle = '#6b4f2a';
  roundRect(ctx, -37, -44, 74, 22, 8);
  ctx.fillStyle = '#fbbf24';
  for (let x = -28; x <= 28; x += 28) roundRect(ctx, x - 8, -58, 16, 18, 4);
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.moveTo(-38, -44); ctx.lineTo(0, -68); ctx.lineTo(38, -44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#111827';
  roundRect(ctx, -11, 1, 22, 36, 11);
  ctx.fillStyle = blue ? '#bfdbfe' : '#fecaca';
  ctx.font = '900 24px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', 0, -26);
  ctx.restore();
  drawHP(ctx, t.x, t.y, t.hp, t.maxHp, 72);
  ctx.globalAlpha = 1;
}

function drawUnit(ctx, u) {
  const enemy = u.owner === 'enemy';
  const dir = enemy ? -1 : 1;
  const team = enemy ? '#dc2626' : '#2563eb';
  ctx.save();
  ctx.translate(u.x, u.y);
  ctx.scale(dir, 1);
  ctx.fillStyle = 'rgba(0,0,0,.24)';
  ctx.beginPath(); ctx.ellipse(0, 24, u.id.includes('giant') ? 30 : 22, 8, 0, 0, Math.PI * 2); ctx.fill();

  if (u.id.includes('giant')) {
    ctx.fillStyle = '#8b5e34'; roundRect(ctx, -21, -13, 42, 44, 18);
    ctx.fillStyle = '#f0b17a'; ctx.beginPath(); ctx.arc(0, -28, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7c2d12'; roundRect(ctx, -16, -48, 32, 12, 6);
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(-7, -29, 2, 0, Math.PI*2); ctx.arc(8, -29, 2, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#3f2a18'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(34, -5); ctx.stroke();
    ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.arc(39, -6, 9, 0, Math.PI * 2); ctx.fill();
  } else if (u.id.includes('archer')) {
    ctx.fillStyle = '#7c2d12'; roundRect(ctx, -11, -2, 22, 29, 8);
    ctx.fillStyle = '#f9a8d4'; ctx.beginPath(); ctx.arc(0, -25, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(0, -34, 17, Math.PI, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(16, -8, 23, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(19, -29); ctx.lineTo(19, 12); ctx.stroke();
  } else if (u.id.includes('knight')) {
    ctx.fillStyle = team; roundRect(ctx, -15, -4, 30, 34, 9);
    ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(0, -25, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = team; roundRect(ctx, -15, -35, 30, 13, 5);
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(35, -23); ctx.stroke();
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(35, -23); ctx.lineTo(42, -31); ctx.stroke();
  } else {
    ctx.fillStyle = team; roundRect(ctx, -14, -2, 28, 31, 8);
    ctx.fillStyle = '#f7c59f'; ctx.beginPath(); ctx.arc(0, -24, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#334155'; roundRect(ctx, -17, -38, 34, 14, 6);
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(20, -7, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.fillStyle = '#111827';
  ctx.beginPath(); ctx.arc(-5, -25, 2, 0, Math.PI * 2); ctx.arc(6, -25, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  drawHP(ctx, u.x, u.y, u.hp, u.maxHp, u.id.includes('giant') ? 58 : 46);
}

function App() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [selected, setSelected] = useState(CARDS[0]);
  const [snapshot, setSnapshot] = useState(null);
  const [banner, setBanner] = useState('Choose a card, then click a lane to deploy.');

  const newGame = () => {
    stateRef.current = {
      running: true,
      time: 0,
      playerElixir: 5,
      enemyElixir: 5,
      nextBot: 1.2,
      units: [],
      sparks: [],
      towers: [...LANES.map(l => makeTower('player', l)), ...LANES.map(l => makeTower('enemy', l))],
      winner: null,
      last: performance.now(),
    };
    setBanner(`Fight started: ${DIFFICULTIES[difficulty].label} bot`);
  };

  useEffect(() => { newGame(); }, [difficulty]);

  const deploy = (owner, card, lane) => {
    const s = stateRef.current;
    const elixirKey = owner === 'player' ? 'playerElixir' : 'enemyElixir';
    if (!s.running || s[elixirKey] < card.cost) return false;
    const diff = DIFFICULTIES[difficulty];
    s[elixirKey] -= card.cost;
    s.units.push({
      ...card,
      id: `${owner}-${card.id}-${Math.random().toString(36).slice(2)}`,
      owner,
      lane,
      x: owner === 'player' ? PLAYER_X + 45 : ENEMY_X - 45,
      y: LANE_Y[lane],
      hp: card.hp * (owner === 'enemy' ? diff.bonus : 1),
      maxHp: card.hp * (owner === 'enemy' ? diff.bonus : 1),
      cd: Math.random() * 0.4,
    });
    return true;
  };

  const botPlay = (s) => {
    const diff = DIFFICULTIES[difficulty];
    const affordable = CARDS.filter(c => c.cost <= s.enemyElixir);
    if (!affordable.length) return;
    const enemyTowers = s.towers.filter(t => t.owner === 'enemy' && t.hp > 0);
    if (!enemyTowers.length) return;
    let lane = Math.floor(Math.random() * 3);
    if (Math.random() < diff.smart) {
      const threats = LANES.map(l => ({ lane: l, pressure: s.units.filter(u => u.owner === 'player' && u.lane === l).reduce((a, u) => a + u.hp + u.dmg * 6, 0) }));
      threats.sort((a, b) => b.pressure - a.pressure);
      lane = threats[0].pressure > 0 ? threats[0].lane : s.towers.filter(t => t.owner === 'player' && t.hp > 0).sort((a,b)=>a.hp-b.hp)[0]?.lane ?? lane;
    }
    let card = affordable[Math.floor(Math.random() * affordable.length)];
    if (Math.random() < diff.smart) {
      const hasThreat = s.units.some(u => u.owner === 'player' && u.lane === lane);
      card = affordable.sort((a, b) => (hasThreat ? b.hp - a.hp : b.dmg - a.dmg))[0];
    }
    deploy('enemy', card, lane);
  };

  const gameTick = (dt) => {
    const s = stateRef.current;
    if (!s?.running) return;
    const diff = DIFFICULTIES[difficulty];
    s.time += dt;
    s.playerElixir = Math.min(MAX_ELIXIR, s.playerElixir + dt * 0.75);
    s.enemyElixir = Math.min(MAX_ELIXIR, s.enemyElixir + dt * 0.75 * diff.elixir);
    s.nextBot -= dt;
    if (s.nextBot <= 0) {
      botPlay(s);
      s.nextBot = diff.think + Math.random() * 0.8;
    }

    for (const u of s.units) {
      const dir = u.owner === 'player' ? 1 : -1;
      const enemies = s.units.filter(v => v.owner !== u.owner && v.lane === u.lane && v.hp > 0);
      const liveTowers = s.towers.filter(t => t.owner !== u.owner && t.lane === u.lane && t.hp > 0);
      const target = [...enemies, ...liveTowers].sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
      if (target && Math.abs(target.x - u.x) <= u.range) {
        u.cd -= dt;
        if (u.cd <= 0) {
          target.hp -= u.dmg;
          u.cd = u.rate;
          s.sparks.push({ x: target.x, y: target.y - 10, ttl: 0.28, txt: `-${Math.round(u.dmg)}` });
        }
      } else {
        u.x += dir * u.speed * dt;
      }
    }
    s.units = s.units.filter(u => u.hp > 0 && u.x > 35 && u.x < 865);
    s.sparks.forEach(p => { p.ttl -= dt; p.y -= dt * 18; });
    s.sparks = s.sparks.filter(p => p.ttl > 0);

    const playerAlive = s.towers.some(t => t.owner === 'player' && t.hp > 0);
    const enemyAlive = s.towers.some(t => t.owner === 'enemy' && t.hp > 0);
    if (!playerAlive || !enemyAlive) {
      s.running = false;
      s.winner = enemyAlive ? 'Bot wins' : 'You win';
      setBanner(s.winner === 'You win' ? '🏆 You destroyed the bot towers!' : '💀 The bot took your towers.');
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawArena(ctx);
    if (!s) return;
    [...s.towers].sort((a,b) => a.y - b.y).forEach(t => drawTower(ctx, t));
    [...s.units].sort((a,b) => a.y - b.y).forEach(u => drawUnit(ctx, u));
    ctx.font = '900 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (const p of s.sparks) {
      ctx.fillStyle = `rgba(255,255,255,${p.ttl/0.28})`;
      ctx.strokeStyle = `rgba(15,23,42,${p.ttl/0.28})`;
      ctx.lineWidth = 3;
      ctx.strokeText(p.txt, p.x, p.y);
      ctx.fillText(p.txt, p.x, p.y);
    }
    if (s.winner) {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff'; ctx.font = '800 54px Inter, sans-serif'; ctx.fillText(s.winner, 450, 255);
    }
  };

  useEffect(() => {
    let raf;
    const loop = (now) => {
      const s = stateRef.current;
      if (s) {
        const dt = Math.min(0.05, (now - s.last) / 1000 || 0);
        s.last = now;
        gameTick(dt);
        draw();
        setSnapshot({ playerElixir: s.playerElixir, enemyElixir: s.enemyElixir, towers: s.towers.map(t => ({ id: t.id, hp: t.hp, maxHp: t.maxHp })), winner: s.winner });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [difficulty]);

  const handleCanvas = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    const lane = LANE_Y.map((ly, i) => ({ i, d: Math.abs(ly - y) })).sort((a,b)=>a.d-b.d)[0].i;
    const ok = deploy('player', selected, lane);
    setBanner(ok ? `Deployed ${selected.name} in lane ${lane + 1}` : 'Not enough elixir yet.');
  };

  const towerSummary = useMemo(() => {
    const s = stateRef.current;
    if (!s) return { player: 0, enemy: 0 };
    return { player: s.towers.filter(t => t.owner === 'player' && t.hp > 0).length, enemy: s.towers.filter(t => t.owner === 'enemy' && t.hp > 0).length };
  }, [snapshot]);

  return <main className="app">
    <section className="panel topbar">
      <div><h1><Crown size={28}/> Essential Clash Duel</h1><p>Cartoon 2D arena battle: place cards, cross bridges, break all three enemy towers.</p></div>
      <div className="controls">
        <label>Bot tier<select value={difficulty} onChange={e => setDifficulty(e.target.value)}>{Object.entries(DIFFICULTIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <button onClick={newGame}><RotateCcw size={16}/> Restart</button>
      </div>
    </section>

    <section className="hud">
      <div className="meter blue"><Zap size={17}/> Your elixir <b>{Math.floor(snapshot?.playerElixir ?? 0)}</b></div>
      <div className="banner">{banner}</div>
      <div className="meter red"><Swords size={17}/> Towers {towerSummary.player} - {towerSummary.enemy}</div>
    </section>

    <canvas ref={canvasRef} width="900" height="504" onClick={handleCanvas} />

    <section className="cards">
      {CARDS.map(card => <button key={card.id} onClick={() => setSelected(card)} className={selected.id === card.id ? 'selected' : ''} style={{'--card': card.color}}>
        <span className="emoji">{card.emoji}</span><b>{card.name}</b><small>{card.cost} elixir · {card.hp} hp · {card.dmg} dmg</small>
      </button>)}
    </section>
    <p className="note">Original fan-made cartoon styling inspired by lane/tower arena games; no Supercell art or copied assets.</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
