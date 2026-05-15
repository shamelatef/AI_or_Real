import { useState, useEffect, useRef } from "react";

// ─── CONFIG: swap these URLs for your real images before the event ───────────
// isAI: true  → this image is the AI-generated one (correct answer)
// isAI: false → this is the real photograph
const ROUNDS = [
  { id: 1, label: "Round 1 – Nature", images: [
    { url: "https://picsum.photos/seed/nature-real-1/700/480", isAI: false },
    { url: "https://picsum.photos/seed/nature-ai-1/700/480",   isAI: true  },
  ]},
  { id: 2, label: "Round 2 – Portrait", images: [
    { url: "https://picsum.photos/seed/portrait-ai-2/700/480",   isAI: true  },
    { url: "https://picsum.photos/seed/portrait-real-2/700/480", isAI: false },
  ]},
  { id: 3, label: "Round 3 – Architecture", images: [
    { url: "https://picsum.photos/seed/arch-real-3/700/480", isAI: false },
    { url: "https://picsum.photos/seed/arch-ai-3/700/480",   isAI: true  },
  ]},
  { id: 4, label: "Round 4 – Food", images: [
    { url: "https://picsum.photos/seed/food-ai-4/700/480",   isAI: true  },
    { url: "https://picsum.photos/seed/food-real-4/700/480", isAI: false },
  ]},
  { id: 5, label: "Round 5 – Animals", images: [
    { url: "https://picsum.photos/seed/animals-real-5/700/480", isAI: false },
    { url: "https://picsum.photos/seed/animals-ai-5/700/480",   isAI: true  },
  ]},
  { id: 6, label: "Round 6 – Abstract", images: [
    { url: "https://picsum.photos/seed/abstract-ai-6/700/480",   isAI: true  },
    { url: "https://picsum.photos/seed/abstract-real-6/700/480", isAI: false },
  ]},
  { id: 7, label: "Round 7 – Sports", images: [
    { url: "https://picsum.photos/seed/sports-real-7/700/480", isAI: false },
    { url: "https://picsum.photos/seed/sports-ai-7/700/480",   isAI: true  },
  ]},
  { id: 8, label: "Round 8 – Cityscape", images: [
    { url: "https://picsum.photos/seed/city-ai-8/700/480",   isAI: true  },
    { url: "https://picsum.photos/seed/city-real-8/700/480", isAI: false },
  ]},
  { id: 9, label: "Round 9 – Interiors", images: [
    { url: "https://picsum.photos/seed/interior-real-9/700/480", isAI: false },
    { url: "https://picsum.photos/seed/interior-ai-9/700/480",   isAI: true  },
  ]},
  { id: 10, label: "Round 10 – People", images: [
    { url: "https://picsum.photos/seed/people-ai-10/700/480",   isAI: true  },
    { url: "https://picsum.photos/seed/people-real-10/700/480", isAI: false },
  ]},
];

const ROUND_SECONDS = 20;

// ─── Timer Ring ───────────────────────────────────────────────────────────────
function TimerRing({ seconds, total }) {
  const r = 36, circ = 2 * Math.PI * r;
  const frac = Math.max(0, seconds / total);
  const color = frac > 0.5 ? "#f0e040" : frac > 0.25 ? "#ff9800" : "#ff3d3d";
  return (
    <svg width="88" height="88" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#1a1a2e" strokeWidth="6" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)}
        strokeLinecap="round" transform="rotate(-90 44 44)"
        style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }} />
      <text x="44" y="50" textAnchor="middle" fill={color}
        style={{ fontSize: 22, fontFamily: "monospace", fontWeight: 700 }}>{seconds}</text>
    </svg>
  );
}

// ─── QR Code ──────────────────────────────────────────────────────────────────
function QRCode({ url, size = 160 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=0a0a0f&color=f0e040&margin=2`;
  return <img src={src} width={size} height={size} alt="QR code" style={{ borderRadius: 8, display: "block" }} />;
}

const screen = {
  minHeight: "100vh", background: "#0a0a0f",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexDirection: "column", padding: "24px 16px",
  fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e0e0e0",
  boxSizing: "border-box",
};

function btn(bg, color, sm) {
  return {
    background: bg, color, border: "none", borderRadius: 10, cursor: "pointer",
    padding: sm ? "10px 22px" : "14px 34px",
    fontSize: sm ? 13 : 15,
    fontWeight: 700, fontFamily: "monospace", letterSpacing: 1,
    transition: "opacity .15s",
  };
}

// ─── Landing ──────────────────────────────────────────────────────────────────
function Landing({ onStart }) {
  const gameUrl = window.location.href;
  return (
    <div style={screen}>
      <div style={{ textAlign: "center", maxWidth: 360, width: "100%" }}>
        <div style={{ fontSize: 56, marginBottom: 6 }}>🤖</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: "#f0e040", fontFamily: "monospace", letterSpacing: -2, lineHeight: 1.1 }}>
          SPOT<br /><span style={{ color: "#fff" }}>THE AI</span>
        </div>
        <div style={{ color: "#555", margin: "10px 0 28px", fontSize: 14 }}>
          10 rounds · tap the AI-generated image · score points for speed
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ background: "#0e0e1a", border: "2px solid #f0e040", borderRadius: 14, padding: 14, marginBottom: 8 }}>
            <QRCode url={gameUrl} size={160} />
          </div>
          <div style={{ color: "#444", fontSize: 11 }}>Scan to play on your phone</div>
        </div>
        <button onClick={onStart} style={{ ...btn("#f0e040", "#0a0a0f"), width: "100%", fontSize: 17, padding: "16px 0" }}>
          ▶ PLAY NOW
        </button>
        <div style={{ color: "#333", fontSize: 12, marginTop: 16 }}>No sign-in required · works after initial load</div>
      </div>
    </div>
  );
}

// ─── Name Entry ───────────────────────────────────────────────────────────────
function NameEntry({ onEnter }) {
  const [name, setName] = useState("");
  const submit = () => { const n = name.trim(); if (n) onEnter(n); };
  return (
    <div style={screen}>
      <div style={{ textAlign: "center", maxWidth: 320, width: "100%", padding: "0 8px" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🤖</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#f0e040", fontFamily: "monospace" }}>SPOT THE AI</div>
        <div style={{ color: "#555", fontSize: 14, margin: "8px 0 26px" }}>Enter your name to start</div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Your name…"
          maxLength={20}
          autoFocus
          style={{
            width: "100%", padding: "13px 15px", background: "#111120",
            boxSizing: "border-box", border: "2px solid #2a2a3e", borderRadius: 10,
            color: "#fff", fontSize: 16, outline: "none", fontFamily: "monospace",
          }}
        />
        <button onClick={submit} style={{ ...btn("#f0e040", "#0a0a0f"), width: "100%", marginTop: 12 }}>
          LET'S GO →
        </button>
      </div>
    </div>
  );
}

// ─── Game ─────────────────────────────────────────────────────────────────────
function Game({ onFinish }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState("question");
  const [chosen, setChosen] = useState(null);
  const [timer, setTimer] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const roundStartRef = useRef(Date.now());
  const resolvedRef = useRef(false);
  const timerRef = useRef(null);

  const round = ROUNDS[roundIdx];
  const correctIdx = round.images.findIndex(i => i.isAI);

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
    setPhase("reveal");
  };

  useEffect(() => {
    resolvedRef.current = false;
    roundStartRef.current = Date.now();
    setTimer(ROUND_SECONDS);
    setPhase("question");
    setChosen(null);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { resolve(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [roundIdx]);

  const next = () => {
    if (roundIdx + 1 >= ROUNDS.length) onFinish({ score, correct });
    else setRoundIdx(i => i + 1);
  };

  // QUESTION
  if (phase === "question") return (
    <div style={screen}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ color: "#555", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
              Round {roundIdx + 1} / {ROUNDS.length}
            </div>
            <div style={{ color: "#f0e040", fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>{round.label}</div>
            <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>Which image is AI-generated?</div>
          </div>
          <TimerRing seconds={timer} total={ROUND_SECONDS} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {round.images.map((img, i) => (
            <button key={i} onClick={() => resolve(i)} style={{
              background: "none", border: "2px solid #2a2a3e", borderRadius: 14,
              overflow: "hidden", cursor: "pointer", padding: 0, position: "relative",
              transition: "border-color .2s",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#f0e040"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a3e"}
            >
              <img src={img.url} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
              <div style={{
                position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.75)",
                color: "#f0e040", fontWeight: 900, fontSize: 22, padding: "4px 14px",
                borderRadius: 6, fontFamily: "monospace",
              }}>{i === 0 ? "A" : "B"}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // REVEAL
  const gotIt = chosen === correctIdx;
  return (
    <div style={screen}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 52 }}>{chosen === null ? "⏰" : gotIt ? "🎯" : "😬"}</div>
          <div style={{ color: chosen === null ? "#ff9800" : gotIt ? "#f0e040" : "#ff6b6b", fontSize: 26, fontWeight: 900, fontFamily: "monospace", marginTop: 6 }}>
            {chosen === null ? "TIME'S UP!" : gotIt ? "CORRECT!" : "WRONG!"}
          </div>
          <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
            The AI image was <span style={{ color: "#f0e040", fontWeight: 700 }}>{correctIdx === 0 ? "A" : "B"}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {round.images.map((img, i) => {
            const isCorrect = img.isAI;
            return (
              <div key={i} style={{
                borderRadius: 12, overflow: "hidden",
                border: `3px solid ${isCorrect ? "#f0e040" : "#ff3d3d"}`,
                boxShadow: isCorrect ? "0 0 22px rgba(240,224,64,0.2)" : "none",
                position: "relative",
              }}>
                <img src={img.url} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block", filter: isCorrect ? "none" : "brightness(0.5)" }} />
                <div style={{
                  position: "absolute", top: 8, left: 8,
                  background: isCorrect ? "#f0e040" : "rgba(0,0,0,0.8)",
                  color: isCorrect ? "#0a0a0f" : "#ff3d3d",
                  fontWeight: 900, fontSize: 11, padding: "4px 10px", borderRadius: 5, fontFamily: "monospace",
                }}>
                  {i === 0 ? "A" : "B"} — {isCorrect ? "🤖 AI ✓" : "📷 REAL ✗"}
                </div>
                {chosen === i && (
                  <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 10, padding: "3px 8px", borderRadius: 4, fontFamily: "monospace" }}>
                    YOUR PICK
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{
          background: "rgba(240,224,64,0.07)", border: "1px solid rgba(240,224,64,0.2)",
          borderRadius: 12, padding: "14px 20px", marginBottom: 18, textAlign: "center",
        }}>
          <div style={{ color: "#555", fontSize: 11, marginBottom: 2 }}>SCORE AFTER {roundIdx + 1}/{ROUNDS.length} ROUNDS</div>
          <div style={{ color: "#f0e040", fontSize: 36, fontWeight: 900, fontFamily: "monospace" }}>{score}</div>
          <div style={{ color: "#666", fontSize: 12 }}>{correct} correct so far</div>
        </div>
        <button onClick={next} style={{ ...btn("#f0e040", "#0a0a0f"), width: "100%" }}>
          {roundIdx + 1 >= ROUNDS.length ? "🏆 See Final Score" : `▶ Round ${roundIdx + 2}`}
        </button>
      </div>
    </div>
  );
}

// ─── Final Score ──────────────────────────────────────────────────────────────
function FinalScore({ name, score, correct, onReplay }) {
  const pct = Math.round((correct / ROUNDS.length) * 100);
  const medal = pct === 100 ? "🏆" : pct >= 70 ? "🥇" : pct >= 50 ? "🥈" : "🥉";
  const msg = pct === 100 ? "Perfect score!" : pct >= 70 ? "Great detective skills!" : pct >= 50 ? "Not bad!" : "Keep practising!";
  return (
    <div style={screen}>
      <div style={{ textAlign: "center", maxWidth: 340, width: "100%", padding: "0 16px" }}>
        <div style={{ fontSize: 64 }}>{medal}</div>
        <div style={{ color: "#f0e040", fontSize: 32, fontWeight: 900, fontFamily: "monospace", marginTop: 8 }}>GAME OVER</div>
        <div style={{ color: "#888", fontSize: 14, marginTop: 4 }}>{name}</div>
        <div style={{
          margin: "24px 0", padding: "22px 24px",
          background: "rgba(240,224,64,0.07)", borderRadius: 16,
          border: "1px solid rgba(240,224,64,0.2)",
        }}>
          <div style={{ color: "#555", fontSize: 12 }}>FINAL SCORE</div>
          <div style={{ color: "#f0e040", fontSize: 52, fontWeight: 900, fontFamily: "monospace" }}>{score}</div>
          <div style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
            {correct} / {ROUNDS.length} correct ({pct}%)
          </div>
          <div style={{ color: "#f0e040", fontSize: 13, marginTop: 8 }}>{msg}</div>
        </div>
        <button onClick={onReplay} style={{ ...btn("#1a1a2e", "#888", true), border: "1px solid #2a2a3e" }}>
          ↺ Play Again
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen2, setScreen] = useState("landing");
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);

  if (screen2 === "landing") return <Landing onStart={() => setScreen("name")} />;
  if (screen2 === "name") return <NameEntry onEnter={n => { setName(n); setScreen("game"); }} />;
  if (screen2 === "game") return <Game name={name} onFinish={r => { setResult(r); setScreen("final"); }} />;
  return <FinalScore name={name} score={result.score} correct={result.correct} onReplay={() => { setResult(null); setScreen("game"); }} />;
}
