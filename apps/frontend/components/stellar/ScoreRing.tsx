type ScoreRingProps = {
  score: number; // 0-100
  size?: number;
  label?: string;
};

function colorForScore(score: number): string {
  if (score >= 70) return "var(--signal-priority)";
  if (score >= 40) return "var(--signal-attention)";
  return "var(--danger)";
}

export function ScoreRing({ score, size = 64, label }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = Math.round(size * 0.12);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = colorForScore(clamped);

  return (
    <div
      style={{ position: "relative", width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Trust score"}: ${clamped}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 300ms ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--mono)",
          fontWeight: 700,
          fontSize: size * 0.28,
          color: "var(--text-1)",
        }}
      >
        {clamped}
      </div>
    </div>
  );
}
