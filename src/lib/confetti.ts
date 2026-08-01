export async function celebrate() {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  const shoot = (particleRatio: number, opts: Record<string, unknown>) =>
    confetti({
      origin: { y: 0.7 },
      colors: ["#38bdf8", "#fbbf24", "#34d399", "#818cf8"],
      particleCount: Math.floor(220 * particleRatio),
      ...opts,
    });

  shoot(0.25, { spread: 26, startVelocity: 55 });
  shoot(0.2, { spread: 60 });
  shoot(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  shoot(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  shoot(0.1, { spread: 120, startVelocity: 45 });
}

/** Bigger, longer burst for crossing a level threshold. */
export async function celebrateLevelUp() {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#38bdf8", "#fbbf24", "#34d399", "#f472b6", "#a78bfa", "#fb923c"];

  const burst = (originX: number) => {
    confetti({
      particleCount: 90,
      spread: 70,
      startVelocity: 48,
      origin: { x: originX, y: 0.65 },
      colors,
    });
  };

  burst(0.2);
  burst(0.5);
  burst(0.8);

  const end = Date.now() + 1800;
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
