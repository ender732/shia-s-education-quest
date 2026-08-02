import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowLeft, Heart, RotateCcw, Star, Zap, Crown } from "lucide-react";
import { ARCADE_GATES_TO_UNLOCK, type ArcadeLevelDef } from "@/lib/arcade/levels";
import { nextQuestion, starsForRun } from "@/lib/arcade/questions";
import {
  intensifyBossTheme,
  type ArcadeChoiceQuestion,
  type ArcadeMode,
  type ArcadeTheme,
} from "@/lib/arcade/types";
import { celebrate } from "@/lib/confetti";

type Phase = "playing" | "challenge" | "cleared" | "gameover";

type Obstacle =
  | { kind: "block"; x: number; w: number; h: number }
  | { kind: "spike"; x: number; w: number; h: number }
  | { kind: "portal"; x: number; w: number; h: number; triggered?: boolean; boss?: boolean }
  | { kind: "orb"; x: number; y: number; r: number; taken?: boolean };

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

const W = 720;
const H = 360;
const GROUND_Y = 292;
const PLAYER_SIZE = 28;
const GRAVITY = 2200;
const JUMP_V = -720;

export type DashGameProps = {
  mode: ArcadeMode;
  level: ArcadeLevelDef;
  /** Gates already banked on this level toward unlock (from persistence). */
  gatesBanked: number;
  getQuestions: (hardness: 1 | 2 | 3) => ArcadeChoiceQuestion[];
  onGateCorrect: () => { unlockedNext: boolean; newlyUnlockedLabel: string | null };
  onLevelClear: (stars: 1 | 2 | 3) => {
    unlockedNext: boolean;
    newlyUnlockedLabel: string | null;
    campaignComplete: boolean;
  };
  onExit: () => void;
};

export function DashGame({
  mode,
  level,
  gatesBanked,
  getQuestions,
  onGateCorrect,
  onLevelClear,
  onExit,
}: DashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const diff = level.difficulty;
  const maxHearts = diff.hearts;

  const [phase, setPhase] = useState<Phase>("playing");
  const [question, setQuestion] = useState<ArcadeChoiceQuestion | null>(null);
  const [hud, setHud] = useState({
    score: 0,
    distance: 0,
    hearts: maxHearts,
    corrects: 0,
    deaths: 0,
    gatesToward: gatesBanked,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [stars, setStars] = useState<1 | 2 | 3>(1);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [campaignDone, setCampaignDone] = useState(false);
  const [isBossChallenge, setIsBossChallenge] = useState(false);

  const stateRef = useRef({
    running: true,
    paused: false,
    y: GROUND_Y - PLAYER_SIZE,
    vy: 0,
    onGround: true,
    speed: diff.baseSpeed,
    scroll: 0,
    distance: 0,
    score: 0,
    hearts: maxHearts,
    corrects: 0,
    deaths: 0,
    invuln: 0,
    obstacles: [] as Obstacle[],
    nextSpawnAt: 420,
    particles: [] as Particle[],
    deck: getQuestions(diff.questionHardness),
    usedQ: new Set<string>(),
    jumpQueued: false,
    camShake: 0,
    flash: 0,
    gauntletPlaced: false,
    gatesToward: gatesBanked,
  });

  const onChallenge = useEffectEvent((q: ArcadeChoiceQuestion, bossPortal: boolean) => {
    setQuestion(q);
    setIsBossChallenge(bossPortal);
    setPhase("challenge");
    setFeedback(null);
  });

  const onHud = useEffectEvent(() => {
    const s = stateRef.current;
    setHud({
      score: Math.floor(s.score),
      distance: Math.floor(s.distance),
      hearts: s.hearts,
      corrects: s.corrects,
      deaths: s.deaths,
      gatesToward: s.gatesToward,
    });
  });

  const onCleared = useEffectEvent(() => {
    const s = stateRef.current;
    const earned = starsForRun(s.score, s.corrects, s.deaths, {
      isBoss: level.isBoss,
      heartsLeft: s.hearts,
    });
    setStars(earned);
    const result = onLevelClear(earned);
    if (result.unlockedNext && result.newlyUnlockedLabel) {
      setUnlockToast(`${result.newlyUnlockedLabel} unlocked!`);
    }
    if (result.campaignComplete) setCampaignDone(true);
    setPhase("cleared");
    void celebrate();
  });

  const onGameOver = useEffectEvent(() => {
    setPhase("gameover");
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = ctx;

    const s = stateRef.current;
    Object.assign(s, {
      running: true,
      paused: false,
      y: GROUND_Y - PLAYER_SIZE,
      vy: 0,
      onGround: true,
      speed: diff.baseSpeed,
      scroll: 0,
      distance: 0,
      score: 0,
      hearts: maxHearts,
      corrects: 0,
      deaths: 0,
      invuln: 0,
      obstacles: [] as Obstacle[],
      nextSpawnAt: 420,
      particles: [] as Particle[],
      deck: getQuestions(diff.questionHardness),
      usedQ: new Set<string>(),
      jumpQueued: false,
      camShake: 0,
      flash: 0,
      gauntletPlaced: false,
      gatesToward: gatesBanked,
    });
    setPhase("playing");
    setQuestion(null);
    setFeedback(null);
    setUnlockToast(null);
    setCampaignDone(false);
    setIsBossChallenge(false);
    onHud();

    let raf = 0;
    let last = performance.now();

    function spawnChunk(forcePortal = false, bossPortal = false) {
      const x = s.scroll + W + 40 + Math.random() * 80;
      if (forcePortal || bossPortal) {
        s.obstacles.push({
          kind: "portal",
          x,
          w: bossPortal ? 48 : 40,
          h: bossPortal ? 82 : 70,
          triggered: false,
          boss: bossPortal,
        });
        return;
      }
      const roll = Math.random();
      const portalCut = 0.62 + diff.portalBias * 0.2;
      if (roll < 0.36) {
        s.obstacles.push({
          kind: "spike",
          x,
          w: 28 + Math.random() * 10,
          h: 26 + Math.random() * 10,
        });
      } else if (roll < portalCut - 0.2) {
        s.obstacles.push({
          kind: "block",
          x,
          w: 36 + Math.random() * 24,
          h: 34 + Math.random() * 40,
        });
      } else if (roll < portalCut) {
        s.obstacles.push({
          kind: "portal",
          x,
          w: 40,
          h: 70,
          triggered: false,
          boss: false,
        });
      } else {
        s.obstacles.push({
          kind: "orb",
          x,
          y: GROUND_Y - 70 - Math.random() * 60,
          r: 10,
          taken: false,
        });
      }
      if (Math.random() < diff.doubleChance) {
        s.obstacles.push({
          kind: Math.random() < 0.5 ? "spike" : "block",
          x: x + 90 + Math.random() * 40,
          w: 30,
          h: 30 + Math.random() * 20,
        } as Obstacle);
      }
    }

    function placeBossGauntlet() {
      const gDef = diff.bossGauntlet;
      if (!gDef || s.gauntletPlaced) return;
      if (s.distance < gDef.startAt) return;
      s.gauntletPlaced = true;
      for (let i = 0; i < gDef.portalCount; i++) {
        s.obstacles.push({
          kind: "portal",
          x: s.scroll + W + 120 + i * gDef.spacing,
          w: 48,
          h: 82,
          triggered: false,
          boss: true,
        });
        if (i < gDef.portalCount - 1) {
          s.obstacles.push({
            kind: "spike",
            x: s.scroll + W + 120 + i * gDef.spacing + gDef.spacing * 0.45,
            w: 32,
            h: 28,
          });
        }
      }
      s.nextSpawnAt = s.scroll + W + 120 + gDef.portalCount * gDef.spacing + 400;
    }

    function hurt() {
      if (s.invuln > 0) return;
      s.hearts -= 1;
      s.deaths += 1;
      s.invuln = 1.4;
      s.camShake = 10;
      s.flash = 0.35;
      burst(80, s.y + PLAYER_SIZE / 2, mode.theme.spike);
      onHud();
      if (s.hearts <= 0) {
        s.running = false;
        onGameOver();
      }
    }

    function burst(x: number, y: number, color: string) {
      for (let i = 0; i < 14; i++) {
        s.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 280,
          vy: -Math.random() * 220 - 40,
          life: 0.45 + Math.random() * 0.35,
          color,
        });
      }
    }

    function jump() {
      if (s.paused || !s.running) return;
      if (s.onGround) {
        s.vy = JUMP_V;
        s.onGround = false;
        burst(60, GROUND_Y - 4, mode.theme.groundLine);
      } else {
        s.jumpQueued = true;
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        jump();
      }
    }

    window.addEventListener("keydown", onKey);

    function frame(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      if (s.running && !s.paused) {
        s.speed =
          diff.baseSpeed + Math.min(diff.speedRampCap, s.distance / diff.speedRampDiv);
        s.scroll += s.speed * dt;
        s.distance = s.scroll;
        s.score += s.speed * dt * 0.12;

        s.vy += GRAVITY * dt;
        s.y += s.vy * dt;
        if (s.y >= GROUND_Y - PLAYER_SIZE) {
          s.y = GROUND_Y - PLAYER_SIZE;
          s.vy = 0;
          if (!s.onGround && s.jumpQueued) {
            s.vy = JUMP_V;
            s.jumpQueued = false;
            s.onGround = false;
          } else {
            s.onGround = true;
            s.jumpQueued = false;
          }
        } else {
          s.onGround = false;
        }

        if (s.invuln > 0) s.invuln -= dt;
        if (s.camShake > 0) s.camShake *= 0.88;
        if (s.flash > 0) s.flash -= dt;

        if (level.isBoss) placeBossGauntlet();

        while (s.nextSpawnAt < s.scroll + W + 200) {
          spawnChunk();
          s.nextSpawnAt += diff.spawnGapMin + Math.random() * diff.spawnGapMax;
        }

        s.obstacles = s.obstacles.filter((o) => o.x + (o.kind === "orb" ? 20 : o.w) > s.scroll - 40);

        const px = 80;
        const py = s.y;
        const pw = PLAYER_SIZE;
        const ph = PLAYER_SIZE;

        for (const o of s.obstacles) {
          const ox = o.x - s.scroll;
          if (o.kind === "orb") {
            if (o.taken) continue;
            const dx = px + pw / 2 - (ox + o.r);
            const dy = py + ph / 2 - o.y;
            if (dx * dx + dy * dy < (o.r + pw / 2) ** 2) {
              o.taken = true;
              s.score += 40;
              burst(ox + o.r, o.y, mode.theme.orb);
            }
            continue;
          }

          const oy = GROUND_Y - o.h;
          const hit =
            px < ox + o.w && px + pw > ox && py < oy + o.h && py + ph > oy;

          if (!hit) continue;

          if (o.kind === "portal" && !o.triggered) {
            o.triggered = true;
            s.paused = true;
            const q = nextQuestion(s.deck, s.usedQ);
            s.usedQ.add(q.id);
            onChallenge(q, Boolean(o.boss));
            continue;
          }

          if (o.kind === "spike" || o.kind === "block") {
            hurt();
            o.x = s.scroll - 100;
          }
        }

        for (const p of s.particles) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 600 * dt;
        }
        s.particles = s.particles.filter((p) => p.life > 0);

        if (s.distance >= diff.targetDistance) {
          s.running = false;
          s.score += s.hearts * 80 + s.corrects * 50;
          onHud();
          onCleared();
        } else if (Math.floor(s.distance) % 40 < 2) {
          onHud();
        }
      }

      draw(g, s, mode, level, diff.targetDistance);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      s.running = false;
    };
    // gatesBanked only seeds a new run — do not re-init when persistence updates mid-run
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runKey + mode/level restart the loop
  }, [mode.id, level.id, runKey]);

  function answer(choiceIndex: number) {
    if (!question || phase !== "challenge") return;
    const s = stateRef.current;
    const ok = choiceIndex === question.correctIndex;
    if (ok) {
      s.corrects += 1;
      s.score += isBossChallenge ? 180 : 120;
      s.invuln = 0.8;
      s.speed = Math.min(s.speed + 18, diff.baseSpeed + diff.speedRampCap + 40);
      if (s.gatesToward < ARCADE_GATES_TO_UNLOCK) {
        const result = onGateCorrect();
        s.gatesToward = Math.min(ARCADE_GATES_TO_UNLOCK, s.gatesToward + 1);
        if (result.unlockedNext && result.newlyUnlockedLabel) {
          setUnlockToast(`${result.newlyUnlockedLabel} unlocked!`);
        }
      }
      setFeedback(
        isBossChallenge
          ? `Boss gate cleared! ${question.tip}`
          : `Nice! ${question.tip}`,
      );
    } else {
      s.hearts -= 1;
      s.deaths += 1;
      s.camShake = 12;
      setFeedback(`Not quite — ${question.tip}`);
      if (s.hearts <= 0) {
        s.running = false;
        s.paused = false;
        onHud();
        setPhase("gameover");
        return;
      }
    }
    onHud();
    window.setTimeout(() => {
      s.paused = false;
      setPhase("playing");
      setQuestion(null);
      setFeedback(null);
      setIsBossChallenge(false);
    }, ok ? 700 : 1100);
  }

  function restart() {
    setRunKey((k) => k + 1);
  }

  function requestJump() {
    const s = stateRef.current;
    if (s.paused || !s.running) return;
    if (s.onGround) {
      s.vy = JUMP_V;
      s.onGround = false;
    } else {
      s.jumpQueued = true;
    }
  }

  const trackPct = Math.min(100, Math.round((hud.distance / diff.targetDistance) * 100));
  const gatesNeeded = ARCADE_GATES_TO_UNLOCK;
  const gatesShow = Math.min(gatesNeeded, hud.gatesToward);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
        >
          <ArrowLeft className="size-3.5" /> Arcade hub
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${
              level.isBoss
                ? "bg-amber-500/20 text-amber-200"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {level.isBoss ? <Crown className="size-3" /> : null}
            {level.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-background/70 px-2 py-1 text-xp">
            <Zap className="size-3" /> {hud.score}
          </span>
          <span className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
            {trackPct}% track
          </span>
          {!level.isBoss && (
            <span
              className="rounded-md px-2 py-1"
              style={{ backgroundColor: mode.theme.uiAccentSoft, color: mode.theme.uiAccent }}
            >
              Gates {gatesShow}/{gatesNeeded}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 text-destructive">
            {Array.from({ length: maxHearts }, (_, i) => (
              <Heart
                key={i}
                className={`size-3.5 ${i < hud.hearts ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
              />
            ))}
          </span>
        </div>
      </div>

      {unlockToast && (
        <p
          className="rounded-lg border px-3 py-2 text-xs font-semibold"
          style={{
            borderColor: mode.theme.uiAccent,
            backgroundColor: mode.theme.uiAccentSoft,
            color: mode.theme.uiAccent,
          }}
        >
          {unlockToast}
        </p>
      )}

      <div className="relative overflow-hidden rounded-xl border border-border shadow-[var(--glow-soft)]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full touch-none bg-background"
          role="img"
          aria-label={`${mode.title} ${level.label} side-scrolling subject dash`}
          onPointerDown={(e) => {
            e.preventDefault();
            requestJump();
          }}
        />

        {(phase === "challenge" || feedback) && question && (
          <div className="absolute inset-0 flex items-end justify-center bg-background/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-6">
            <div
              className={`w-full max-w-md rounded-xl border p-4 shadow-[var(--glow-soft)] ${
                isBossChallenge ? "bg-surface/95" : "border-border bg-surface/95"
              }`}
              style={
                isBossChallenge
                  ? { borderColor: mode.theme.portal }
                  : undefined
              }
            >
              <p
                className="font-display text-sm font-bold sm:text-base"
                style={{ color: isBossChallenge ? mode.theme.portal : mode.theme.uiAccent }}
              >
                {isBossChallenge ? "Boss gate" : "Challenge gate"} · {mode.theme.accentLabel}
              </p>
              <p className="mt-2 text-sm font-semibold leading-snug">{question.prompt}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {question.choices.map((c, i) => (
                  <button
                    key={`${question.id}-${c}`}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() => answer(i)}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm font-bold transition disabled:opacity-60"
                    style={{ ["--tw-hover" as string]: mode.theme.uiAccent }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = mode.theme.uiAccent;
                      e.currentTarget.style.backgroundColor = mode.theme.uiAccentSoft;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "";
                      e.currentTarget.style.backgroundColor = "";
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {feedback && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{feedback}</p>
              )}
            </div>
          </div>
        )}

        {(phase === "cleared" || phase === "gameover") && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 text-center shadow-[var(--glow-soft)]">
              <h3 className="font-display text-lg font-bold">
                {phase === "cleared"
                  ? level.isBoss
                    ? campaignDone
                      ? "Campaign cleared!"
                      : "Boss defeated!"
                    : "Level cleared!"
                  : "Out of hearts"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Score {hud.score} · {hud.corrects} gates solved
              </p>
              {phase === "gameover" && hud.gatesToward > 0 && !level.isBoss && (
                <p className="mt-2 text-xs" style={{ color: mode.theme.uiAccent }}>
                  Gate progress saved: {Math.min(gatesNeeded, hud.gatesToward)}/{gatesNeeded} toward
                  next unlock
                </p>
              )}
              {phase === "cleared" && (
                <div className="mt-3 flex justify-center gap-1 text-xp">
                  {([1, 2, 3] as const).map((n) => (
                    <Star
                      key={n}
                      className={`size-6 ${n <= stars ? "fill-xp text-xp" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
              )}
              {unlockToast && phase === "cleared" && (
                <p className="mt-2 text-xs font-semibold" style={{ color: mode.theme.uiAccent }}>
                  {unlockToast}
                </p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Practice stars only — lesson XP stays on your TaskBoard.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={restart}
                  className="glow-ring inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  <RotateCcw className="size-3.5" /> Play again
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-bold"
                >
                  Back to hub
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Jump: <kbd className="rounded bg-secondary px-1.5 py-0.5 font-semibold">Space</kbd> /{" "}
          <kbd className="rounded bg-secondary px-1.5 py-0.5 font-semibold">↑</kbd> / tap · Clear
          track or {gatesNeeded} gates unlocks next
        </p>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            requestJump();
          }}
          className="glow-ring min-h-12 min-w-[8rem] rounded-xl px-6 py-3 text-sm font-bold text-primary-foreground sm:hidden"
          style={{ backgroundColor: mode.theme.uiAccent }}
        >
          Jump
        </button>
      </div>
    </div>
  );
}

function bossTint(theme: ArcadeTheme): ArcadeTheme {
  return intensifyBossTheme(theme);
}

function draw(
  ctx: CanvasRenderingContext2D,
  s: {
    scroll: number;
    y: number;
    invuln: number;
    camShake: number;
    flash: number;
    obstacles: Obstacle[];
    particles: Particle[];
    distance: number;
  },
  mode: ArcadeMode,
  level: ArcadeLevelDef,
  targetDistance: number,
) {
  const theme = level.isBoss ? bossTint(mode.theme) : mode.theme;
  const shakeX = (Math.random() - 0.5) * s.camShake;
  const shakeY = (Math.random() - 0.5) * s.camShake;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(-10, -10, W + 20, H + 20);

  if (level.isBoss) {
    ctx.fillStyle = "rgba(245,158,11,0.06)";
    for (let i = 0; i < 6; i++) {
      const bx = ((-s.scroll * 0.2 + i * 140) % (W + 160)) - 40;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 40, H);
      ctx.lineTo(bx + 70, H);
      ctx.lineTo(bx + 30, 0);
      ctx.fill();
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let i = 0; i < 4; i++) {
    const base = ((-s.scroll * (0.15 + i * 0.05)) % (W + 200)) + i * 160;
    ctx.beginPath();
    ctx.moveTo(base - 80, GROUND_Y);
    ctx.quadraticCurveTo(base + 40, GROUND_Y - 50 - i * 12, base + 160, GROUND_Y);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  const gridOff = -(s.scroll * 0.4) % 40;
  for (let x = gridOff; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }

  ctx.fillStyle = theme.ground;
  ctx.fillRect(-10, GROUND_Y, W + 20, H - GROUND_Y + 10);
  ctx.fillStyle = theme.groundLine;
  ctx.fillRect(-10, GROUND_Y, W + 20, 3);

  const prog = Math.min(1, s.distance / targetDistance);
  ctx.fillStyle = theme.portal;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, GROUND_Y + 6, W * prog, 4);
  ctx.globalAlpha = 1;

  for (const o of s.obstacles) {
    const ox = o.x - s.scroll;
    if (ox < -80 || ox > W + 80) continue;

    if (o.kind === "orb") {
      if (o.taken) continue;
      ctx.beginPath();
      ctx.fillStyle = theme.orb;
      ctx.shadowColor = theme.orb;
      ctx.shadowBlur = 12;
      ctx.arc(ox + o.r, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      continue;
    }

    const oy = GROUND_Y - o.h;
    if (o.kind === "spike") {
      ctx.fillStyle = theme.spike;
      ctx.beginPath();
      ctx.moveTo(ox, GROUND_Y);
      ctx.lineTo(ox + o.w / 2, oy);
      ctx.lineTo(ox + o.w, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    } else if (o.kind === "block") {
      ctx.fillStyle = theme.obstacle;
      roundRect(ctx, ox, oy, o.w, o.h, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.stroke();
    } else if (o.kind === "portal") {
      const isBoss = Boolean(o.boss);
      ctx.save();
      ctx.shadowColor = isBoss ? "#f59e0b" : theme.portal;
      ctx.shadowBlur = o.triggered ? 4 : isBoss ? 24 : 18;
      ctx.fillStyle = o.triggered
        ? "rgba(251,191,36,0.25)"
        : isBoss
          ? "#f59e0b"
          : theme.portal;
      roundRect(ctx, ox, oy, o.w, o.h, 8);
      ctx.fill();
      ctx.fillStyle = theme.skyTop;
      roundRect(ctx, ox + 6, oy + 8, o.w - 12, o.h - 16, 4);
      ctx.fill();
      ctx.restore();
      if (!o.triggered) {
        ctx.fillStyle = isBoss ? "#fbbf24" : theme.portal;
        ctx.font = "bold 11px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isBoss ? "!" : "?", ox + o.w / 2, oy + o.h / 2 + 4);
      }
    }
  }

  const px = 80;
  const blink = s.invuln > 0 && Math.floor(s.invuln * 12) % 2 === 0;
  if (!blink) {
    ctx.save();
    ctx.shadowColor = theme.playerGlow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = theme.player;
    roundRect(ctx, px, s.y, PLAYER_SIZE, PLAYER_SIZE, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.skyTop;
    ctx.fillRect(px + 6, s.y + 8, 6, 6);
    ctx.fillRect(px + 16, s.y + 8, 6, 6);
    ctx.fillRect(px + 8, s.y + 18, 12, 3);
    ctx.restore();
  }

  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  if (s.flash > 0) {
    ctx.fillStyle = `rgba(248,113,113,${s.flash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "bold 12px 'Bricolage Grotesque', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${mode.title} · ${level.label}`, 14, 22);

  if (level.isBoss) {
    ctx.fillStyle = "rgba(245,158,11,0.85)";
    ctx.font = "bold 11px 'Space Grotesk', sans-serif";
    ctx.fillText("BOSS RUN", 14, 40);
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
