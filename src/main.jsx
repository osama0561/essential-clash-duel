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
  { id: 'guard', name: 'Guard', cost: 2, hp: 155, dmg: 22, speed: 44, range: 20, rate: 0.9, emoji: '🛡️', color: '#60a5fa' },
  { id: 'knight', name: 'Knight', cost: 3, hp: 260, dmg: 32, speed: 35, range: 22, rate: 1.05, emoji: '⚔️', color: '#f59e0b' },
  { id: 'archer', name: 'Archer', cost: 3, hp: 125, dmg: 24, speed: 32, range: 118, rate: 0.75, emoji: '🏹', color: '#fb7185' },
  { id: 'giant', name: 'Giant', cost: 5, hp: 520, dmg: 46, speed: 22, range: 26, rate: 1.25, emoji: '🪨', color: '#a78bfa' },
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
      let target = [...enemies, ...liveTowers].sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
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
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#123d2d'); g.addColorStop(1, '#0f2b3f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (const y of LANE_Y) { ctx.fillRect(120, y - 38, 660, 76); }
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(450, 58); ctx.lineTo(450, 445); ctx.stroke();
    ctx.fillStyle = 'rgba(96,165,250,.18)'; ctx.fillRect(0, 0, 450, 504);
    ctx.fillStyle = 'rgba(248,113,113,.18)'; ctx.fillRect(450, 0, 450, 504);

    const drawHp = (x, y, hp, max) => {
      const w = 64; const pct = Math.max(0, hp / max);
      ctx.fillStyle = '#111827'; ctx.fillRect(x - w/2, y - 48, w, 7);
      ctx.fillStyle = hpColor(pct); ctx.fillRect(x - w/2, y - 48, w * pct, 7);
    };
    if (!s) return;
    for (const t of s.towers) {
      if (t.hp <= 0) { ctx.globalAlpha = .35; }
      ctx.fillStyle = t.owner === 'player' ? '#2563eb' : '#dc2626';
      ctx.beginPath(); ctx.roundRect(t.x - 28, t.y - 34, 56, 68, 8); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♜', t.x, t.y + 10);
      drawHp(t.x, t.y, t.hp, t.maxHp); ctx.globalAlpha = 1;
    }
    for (const u of s.units) {
      ctx.fillStyle = u.owner === 'player' ? u.color : '#ef4444';
      ctx.beginPath(); ctx.arc(u.x, u.y, 20, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(u.emoji, u.x, u.y + 7);
      drawHp(u.x, u.y, u.hp, u.maxHp);
    }
    ctx.font = '700 14px Inter, sans-serif';
    for (const p of s.sparks) { ctx.fillStyle = `rgba(255,255,255,${p.ttl/0.28})`; ctx.fillText(p.txt, p.x, p.y); }
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
      <div><h1><Crown size={28}/> Essential Clash Duel</h1><p>Minimal lane battle: place cards, break all three enemy towers.</p></div>
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
    <p className="note">Fan-made original prototype using simple shapes/emojis only; no Supercell assets.</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
