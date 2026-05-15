import { useState, useEffect, useRef } from "react";
import { hasDB, submitScore, getScores } from "./db.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2, 10); }

function encodeConfig(cfg) {
  try { return btoa(JSON.stringify(cfg)); } catch { return ''; }
}
function decodeConfig(s) {
  try { return JSON.parse(atob(s)); } catch { return null; }
}

const DEFAULT_ROUNDS = Array.from({ length: 10 }, (_, i) => ({
  label: `Round ${i + 1}`,
  a: `https://picsum.photos/seed/img-a-${i + 1}/700/480`,
  b: `https://picsum.photos/seed/img-b-${i + 1}/700/480`,
  ai: 0,
}));

// ─── Shared styles ────────────────────────────────────────────────────────────
const pg = {
  minHeight: '100vh', background: '#0a0a0f',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexDirection: 'column', padding: '24px 16px',
  fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#e0e0e0',
  boxSizing: 'border-box',
};
function btn(bg, fg, sm) {
  return {
    background: bg, color: fg, border: 'none', borderRadius: 10,
    cursor: 'pointer', fontWeight: 700, fontFamily: 'monospace',
    letterSpacing: 1, padding: sm ? '9px 20px' : '13px 32px',
    fontSize: sm ? 13 : 15, transition: 'opacity .15s',
  };
}
const inp = {
  width: '100%', padding: '9px 11px', background: '#111120',
  border: '1.5px solid #2a2a3e', borderRadius: 8, color: '#fff',
  fontSize: 13, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
};
const card = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, padding: '14px',
};

// ─── Shared components ────────────────────────────────────────────────────────
function TimerRing({ seconds, total }) {
  const r = 36, circ = 2 * Math.PI * r;
  const frac = Math.max(0, seconds / total);
  const color = frac > 0.5 ? '#f0e040' : frac > 0.25 ? '#ff9800' : '#ff3d3d';
  return (
    <svg width="88" height="88" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#1a1a2e" strokeWidth="6" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)}
        strokeLinecap="round" transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="44" y="50" textAnchor="middle" fill={color}
        style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 700 }}>{seconds}</text>
    </svg>
  );
}

function QRCode({ url, size = 170 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=0a0a0f&color=f0e040&margin=2`;
  return <img src={src} width={size} height={size} alt="QR code" style={{ borderRadius: 8, display: 'block' }} />;
}

function LeaderRow({ rank, name, score, correct, total, highlight }) {
  const icon = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      borderRadius: 10, marginBottom: 6,
      background: highlight ? 'rgba(240,224,64,0.1)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${highlight ? 'rgba(240,224,64,0.3)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <span style={{ fontSize: 18, minWidth: 28, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1, color: highlight ? '#f0e040' : '#ddd', fontFamily: 'monospace', fontWeight: highlight ? 700 : 400, fontSize: 14 }}>{name}</span>
      <span style={{ color: '#555', fontSize: 12 }}>{correct}/{total}✓</span>
      <span style={{ color: '#f0e040', fontWeight: 700, fontFamily: 'monospace', fontSize: 16, minWidth: 55, textAlign: 'right' }}>{score}</span>
    </div>
  );
}

// ─── SCREEN: Landing ──────────────────────────────────────────────────────────
function Landing() {
  const base = window.location.href.split('?')[0];
  return (
    <div style={pg}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 56, marginBottom: 6 }}>🤖</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: '#f0e040', fontFamily: 'monospace', letterSpacing: -2, lineHeight: 1.1 }}>
          SPOT<br /><span style={{ color: '#fff' }}>THE AI</span>
        </div>
        <div style={{ color: '#555', margin: '10px 0 32px', fontSize: 14 }}>
          10 rounds · tap the AI-generated image · score points for speed
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a href={`${base}?mode=host`}
            style={{ ...btn('#f0e040', '#0a0a0f'), textDecoration: 'none', display: 'block', padding: '16px 0', textAlign: 'center', fontSize: 17 }}>
            📺 I'm the Host — Set up game
          </a>
          <div style={{ color: '#333', fontSize: 12, marginTop: 8 }}>
            Players join by scanning the QR on the host screen
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: Host Setup ───────────────────────────────────────────────────────
function HostSetup() {
  const [rounds, setRounds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aig-rounds')) || DEFAULT_ROUNDS; }
    catch { return DEFAULT_ROUNDS; }
  });
  const [duration, setDuration] = useState(20);
  const [session] = useState(() => localStorage.getItem('aig-session') || genId());
  const [playerUrl, setPlayerUrl] = useState('');
  const [boardUrl, setBoardUrl] = useState('');

  useEffect(() => { localStorage.setItem('aig-session', session); }, [session]);

  const setRoundField = (i, field, val) =>
    setRounds(r => r.map((round, idx) => idx === i ? { ...round, [field]: val } : round));

  const generate = () => {
    localStorage.setItem('aig-rounds', JSON.stringify(rounds));
    const cfg = { session, duration, rounds };
    const base = window.location.href.split('?')[0];
    setPlayerUrl(`${base}?c=${encodeConfig(cfg)}`);
    setBoardUrl(`${base}?board=${session}`);
  };

  return (
    <div style={{ ...pg, alignItems: 'stretch', justifyContent: 'flex-start' }}>
      <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', paddingTop: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#f0e040', fontFamily: 'monospace' }}>⚙️ HOST SETUP</div>
            <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
              Enter image URLs · mark which is AI · click Generate
            </div>
          </div>
          <a href={window.location.href.split('?')[0]} style={{ color: '#444', fontSize: 12, fontFamily: 'monospace' }}>← Home</a>
        </div>

        {/* Duration */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <label style={{ color: '#888', fontSize: 13, whiteSpace: 'nowrap' }}>Seconds / round</label>
          <input type="range" min={10} max={60} step={5} value={duration}
            onChange={e => setDuration(+e.target.value)}
            style={{ flex: 1, accentColor: '#f0e040' }} />
          <span style={{ color: '#f0e040', fontWeight: 700, fontFamily: 'monospace', minWidth: 36 }}>{duration}s</span>
        </div>

        {/* Round cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {rounds.map((round, i) => (
            <div key={i} style={card}>
              {/* Round label row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ color: '#f0e040', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, minWidth: 22 }}>{i + 1}</span>
                <input value={round.label} onChange={e => setRoundField(i, 'label', e.target.value)}
                  placeholder={`Round ${i + 1} label…`} style={{ ...inp, flex: 1 }} />
              </div>

              {/* Image URL inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ color: '#555', fontSize: 10, marginBottom: 4, fontFamily: 'monospace', letterSpacing: 1 }}>IMAGE A — URL</div>
                  <input value={round.a} onChange={e => setRoundField(i, 'a', e.target.value)}
                    placeholder="https://…" style={inp} />
                </div>
                <div>
                  <div style={{ color: '#555', fontSize: 10, marginBottom: 4, fontFamily: 'monospace', letterSpacing: 1 }}>IMAGE B — URL</div>
                  <input value={round.b} onChange={e => setRoundField(i, 'b', e.target.value)}
                    placeholder="https://…" style={inp} />
                </div>
              </div>

              {/* Which is AI */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#555', fontSize: 12 }}>🤖 AI image is:</span>
                {['A', 'B'].map((lbl, idx) => (
                  <button key={idx} onClick={() => setRoundField(i, 'ai', idx)}
                    style={{
                      ...btn(round.ai === idx ? '#f0e040' : 'transparent', round.ai === idx ? '#0a0a0f' : '#666', true),
                      border: `1.5px solid ${round.ai === idx ? '#f0e040' : '#2a2a3e'}`,
                      padding: '6px 18px',
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Generate button */}
        <button onClick={generate}
          style={{ ...btn('#f0e040', '#0a0a0f'), width: '100%', marginBottom: 20, fontSize: 16 }}>
          ✅ Generate QR Codes
        </button>

        {/* Output QRs */}
        {playerUrl && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
            {/* Player QR */}
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ color: '#f0e040', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, marginBottom: 10, letterSpacing: 1 }}>
                📱 PLAYER QR — share this
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <QRCode url={playerUrl} size={160} />
              </div>
              <div style={{ color: '#444', fontSize: 10 }}>Players scan to play the game</div>
            </div>

            {/* Board QR */}
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ color: '#f0e040', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, marginBottom: 10, letterSpacing: 1 }}>
                🏆 LEADERBOARD
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <QRCode url={boardUrl} size={160} />
              </div>
              {hasDB ? (
                <a href={boardUrl} target="_blank" rel="noreferrer"
                  style={{ color: '#f0e040', fontSize: 11, fontFamily: 'monospace', display: 'block', marginTop: 6 }}>
                  Open leaderboard →
                </a>
              ) : (
                <div style={{ color: '#ff9800', fontSize: 10, marginTop: 6, lineHeight: 1.4 }}>
                  ⚠️ Supabase not configured<br />
                  <span style={{ color: '#444' }}>Add VITE_SUPABASE_URL + KEY to GitHub Secrets to enable</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCREEN: Live Leaderboard ─────────────────────────────────────────────────
function LiveLeaderboard({ session }) {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const poll = async () => { setScores(await getScores(session)); };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [session]);

  return (
    <div style={pg}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36 }}>🏆</div>
          <div style={{ color: '#f0e040', fontSize: 28, fontWeight: 900, fontFamily: 'monospace' }}>LEADERBOARD</div>
          <div style={{ color: '#333', fontSize: 11, marginTop: 4 }}>Live · refreshes every 3 s</div>
        </div>

        {!hasDB && (
          <div style={{ ...card, textAlign: 'center', color: '#ff9800', marginBottom: 20 }}>
            ⚠️ Supabase not configured — no scores to show
          </div>
        )}

        {hasDB && scores.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444', padding: 40 }}>Waiting for players to finish…</div>
        )}

        {scores.map((s, i) => (
          <LeaderRow key={i} rank={i} name={s.name} score={s.score} correct={s.correct} total={s.total} />
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN: Player Name ──────────────────────────────────────────────────────
function PlayerName({ onEnter }) {
  const [name, setName] = useState('');
  const submit = () => { const n = name.trim(); if (n) onEnter(n); };
  return (
    <div style={pg}>
      <div style={{ textAlign: 'center', maxWidth: 320, width: '100%', padding: '0 8px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🤖</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#f0e040', fontFamily: 'monospace' }}>SPOT THE AI</div>
        <div style={{ color: '#555', fontSize: 14, margin: '8px 0 26px' }}>Enter your name to start</div>
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Your name…" maxLength={20} autoFocus
          style={{ ...inp, padding: '13px 15px', fontSize: 16, borderRadius: 10, border: '2px solid #2a2a3e' }} />
        <button onClick={submit} style={{ ...btn('#f0e040', '#0a0a0f'), width: '100%', marginTop: 12 }}>
          LET'S GO →
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN: Player Game ──────────────────────────────────────────────────────
function PlayerGame({ config, onFinish }) {
  const { rounds, duration = 20 } = config;
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState('question');
  const [chosen, setChosen] = useState(null);
  const [timer, setTimer] = useState(duration);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const roundStartRef = useRef(Date.now());
  const resolvedRef = useRef(false);
  const timerRef = useRef(null);

  const round = rounds[roundIdx];
  const correctIdx = round.ai;

  const resolve = (chosenIdx) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearInterval(timerRef.current);
    const elapsed = (Date.now() - roundStartRef.current) / 1000;
    const isCorrect = chosenIdx === correctIdx;
    const pts = isCorrect ? Math.max(100, Math.round(1000 - elapsed * 40)) : 0;
    setChosen(chosenIdx);
    setScore(s => s + pts);
    setCorrect(c => c + (isCorrect ? 1 : 0));
    setPhase('reveal');
  };

  useEffect(() => {
    resolvedRef.current = false;
    roundStartRef.current = Date.now();
    setTimer(duration);
    setPhase('question');
    setChosen(null);
    timerRef.current = setInterval(() => {
      setTimer(t => { if (t <= 1) { resolve(null); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [roundIdx]);

  const next = () => {
    if (roundIdx + 1 >= rounds.length) onFinish({ score, correct });
    else setRoundIdx(i => i + 1);
  };

  // Question phase
  if (phase === 'question') return (
    <div style={pg}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ color: '#555', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
              Round {roundIdx + 1} / {rounds.length}
            </div>
            <div style={{ color: '#f0e040', fontWeight: 700, fontSize: 18, fontFamily: 'monospace' }}>{round.label}</div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>Which image is AI-generated?</div>
          </div>
          <TimerRing seconds={timer} total={duration} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[round.a, round.b].map((url, i) => (
            <button key={i} onClick={() => resolve(i)} style={{
              background: 'none', border: '2px solid #2a2a3e', borderRadius: 14,
              overflow: 'hidden', cursor: 'pointer', padding: 0, position: 'relative',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#f0e040'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a3e'}
            >
              {url
                ? <img src={url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: 180, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 13 }}>No image</div>
              }
              <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.75)', color: '#f0e040', fontWeight: 900, fontSize: 22, padding: '4px 14px', borderRadius: 6, fontFamily: 'monospace' }}>
                {i === 0 ? 'A' : 'B'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Reveal phase
  const gotIt = chosen === correctIdx;
  return (
    <div style={pg}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 52 }}>{chosen === null ? '⏰' : gotIt ? '🎯' : '😬'}</div>
          <div style={{ color: chosen === null ? '#ff9800' : gotIt ? '#f0e040' : '#ff6b6b', fontSize: 26, fontWeight: 900, fontFamily: 'monospace', marginTop: 6 }}>
            {chosen === null ? "TIME'S UP!" : gotIt ? 'CORRECT!' : 'WRONG!'}
          </div>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
            The AI image was <span style={{ color: '#f0e040', fontWeight: 700 }}>{correctIdx === 0 ? 'A' : 'B'}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[round.a, round.b].map((url, i) => {
            const isCorrect = i === correctIdx;
            return (
              <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: `3px solid ${isCorrect ? '#f0e040' : '#ff3d3d'}`, position: 'relative', boxShadow: isCorrect ? '0 0 20px rgba(240,224,64,0.2)' : 'none' }}>
                {url
                  ? <img src={url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', filter: isCorrect ? 'none' : 'brightness(0.5)' }} />
                  : <div style={{ width: '100%', height: 130, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>—</div>
                }
                <div style={{ position: 'absolute', top: 7, left: 7, background: isCorrect ? '#f0e040' : 'rgba(0,0,0,0.85)', color: isCorrect ? '#0a0a0f' : '#ff3d3d', fontWeight: 900, fontSize: 10, padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                  {i === 0 ? 'A' : 'B'} — {isCorrect ? '🤖 AI ✓' : '📷 REAL ✗'}
                </div>
                {chosen === i && (
                  <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' }}>YOUR PICK</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ ...card, textAlign: 'center', marginBottom: 14 }}>
          <div style={{ color: '#555', fontSize: 11, marginBottom: 2 }}>SCORE — {roundIdx + 1}/{rounds.length}</div>
          <div style={{ color: '#f0e040', fontSize: 36, fontWeight: 900, fontFamily: 'monospace' }}>{score}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{correct} correct</div>
        </div>
        <button onClick={next} style={{ ...btn('#f0e040', '#0a0a0f'), width: '100%' }}>
          {roundIdx + 1 >= rounds.length ? '🏆 Final Score' : `▶ Round ${roundIdx + 2}`}
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN: Final Score ──────────────────────────────────────────────────────
function FinalScore({ name, score, correct, total, session, onReplay }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    await submitScore({ session, name, score, correct, total });
    setSubmitted(true);
    setSubmitting(false);
  };

  const pct = Math.round((correct / total) * 100);
  const medal = pct === 100 ? '🏆' : pct >= 70 ? '🥇' : pct >= 50 ? '🥈' : '🥉';
  const msg = pct === 100 ? 'Perfect score!' : pct >= 70 ? 'Great detective skills!' : pct >= 50 ? 'Not bad!' : 'Keep practising!';

  return (
    <div style={pg}>
      <div style={{ textAlign: 'center', maxWidth: 340, width: '100%', padding: '0 16px' }}>
        <div style={{ fontSize: 64 }}>{medal}</div>
        <div style={{ color: '#f0e040', fontSize: 32, fontWeight: 900, fontFamily: 'monospace', marginTop: 8 }}>GAME OVER</div>
        <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{name}</div>
        <div style={{ ...card, margin: '22px 0', padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ color: '#555', fontSize: 12 }}>FINAL SCORE</div>
          <div style={{ color: '#f0e040', fontSize: 50, fontWeight: 900, fontFamily: 'monospace' }}>{score}</div>
          <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{correct}/{total} correct ({pct}%)</div>
          <div style={{ color: '#f0e040', fontSize: 13, marginTop: 8 }}>{msg}</div>
        </div>

        {hasDB && !submitted && (
          <button onClick={submit} disabled={submitting}
            style={{ ...btn('#22c55e', '#fff'), width: '100%', marginBottom: 10, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Submitting…' : '📊 Submit to Leaderboard'}
          </button>
        )}
        {submitted && (
          <div style={{ color: '#22c55e', fontSize: 14, marginBottom: 10, fontFamily: 'monospace' }}>✅ Score submitted!</div>
        )}
        {!hasDB && (
          <div style={{ color: '#555', fontSize: 12, marginBottom: 10 }}>
            Screenshot your score to share with the host
          </div>
        )}

        <button onClick={onReplay}
          style={{ ...btn('transparent', '#555', true), border: '1px solid #2a2a3e' }}>
          ↺ Play Again
        </button>
      </div>
    </div>
  );
}

// ─── Player flow (name → game → final) ───────────────────────────────────────
function PlayerFlow({ config }) {
  const [screen, setScreen] = useState('name');
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);

  if (screen === 'name') return (
    <PlayerName onEnter={n => { setName(n); setScreen('game'); }} />
  );
  if (screen === 'game') return (
    <PlayerGame config={config} onFinish={r => { setResult(r); setScreen('final'); }} />
  );
  return (
    <FinalScore
      name={name} score={result.score} correct={result.correct}
      total={config.rounds.length} session={config.session}
      onReplay={() => { setResult(null); setScreen('game'); }}
    />
  );
}

// ─── Root router ──────────────────────────────────────────────────────────────
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const mode     = params.get('mode');
  const configB64 = params.get('c');
  const boardSession = params.get('board');

  if (mode === 'host') return <HostSetup />;
  if (boardSession)   return <LiveLeaderboard session={boardSession} />;
  if (configB64) {
    const config = decodeConfig(configB64);
    if (config) return <PlayerFlow config={config} />;
  }
  return <Landing />;
}
