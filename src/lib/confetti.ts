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
