import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BarrelPoint = { barrel: number; push: number };

type Props = {
  points: BarrelPoint[];
  current: number;
  low: number;
  high: number;
};

export function BarrelChart(props: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return <div className="h-56 rounded-md border border-border bg-surface" />;
  }
  return <BarrelChartInner {...props} />;
}

function Tip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: number;
}) {
  if (!active || label == null || !payload?.length) return null;
  const value = payload[0]?.value;
  if (value == null) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-mono text-fg">{label} in barrel</p>
      <p className="text-muted">{Math.round(value)}% of this powder's push</p>
    </div>
  );
}

function BarrelChartInner({ points, current, low, high }: Props) {
  const x1 = Math.max(6, Math.min(low, high));
  const x2 = Math.min(32, Math.max(low, high));
  return (
    <div className="h-56 w-full" role="img" aria-label="Powder push versus barrel length">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="barrel"
            type="number"
            domain={[6, 32]}
            ticks={[8, 12, 16, 20, 24, 28]}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => `${value}`}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            width={40}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip content={<Tip />} />
          <ReferenceArea x1={x1} x2={x2} fill="var(--color-primary)" fillOpacity={0.2} />
          <ReferenceLine x={current} stroke="var(--color-fg)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="push"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
