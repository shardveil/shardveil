// ─── CardPriceChart ───────────────────────────────────────────────────────────
// Simple SVG line chart of price history. No external chart library.

interface PricePoint {
  timestamp: number;
  price: string;
}

interface CardPriceChartProps {
  priceHistory: PricePoint[];
}

// Format timestamp to short date label (e.g. "May 1")
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CardPriceChart({ priceHistory }: CardPriceChartProps) {
  if (priceHistory.length < 2) {
    return (
      <section aria-label="Price history">
        <h3 className="mb-3 font-display text-xs uppercase tracking-widest text-content-muted">
          Price History
        </h3>
        <div className="flex h-[120px] items-center justify-center rounded-lg border border-stroke-base bg-surface-elevated">
          <p className="font-body text-sm text-content-muted italic">
            No price history available.
          </p>
        </div>
      </section>
    );
  }

  // ── Chart constants ──
  const VIEW_W = 400;
  const VIEW_H = 120;
  const PAD_LEFT = 48;
  const PAD_RIGHT = 8;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;
  const CHART_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
  const CHART_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

  const prices = priceHistory.map((p) => parseFloat(p.price));
  const minPrice = Math.min(...(prices as [number, ...number[]]));
  const maxPrice = Math.max(...(prices as [number, ...number[]]));
  const priceRange = maxPrice - minPrice || 1; // avoid division by zero

  const points = priceHistory.map((p, i) => {
    const x = PAD_LEFT + (i / (priceHistory.length - 1)) * CHART_W;
    const y =
      PAD_TOP +
      CHART_H -
      ((parseFloat(p.price) - minPrice) / priceRange) * CHART_H;
    return { x, y, ts: p.timestamp, price: p.price };
  });

  // We asserted length >= 2 above, so these accesses are safe
  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;

  const polylinePoints = points.map((pt) => `${pt.x},${pt.y}`).join(" ");

  // Area fill: close the path below the line
  const areaPath =
    `M ${firstPoint.x},${firstPoint.y} ` +
    points
      .slice(1)
      .map((pt) => `L ${pt.x},${pt.y}`)
      .join(" ") +
    ` L ${lastPoint.x},${PAD_TOP + CHART_H}` +
    ` L ${firstPoint.x},${PAD_TOP + CHART_H} Z`;

  // X-axis labels: show at most 5 evenly spaced ticks
  const tickCount = Math.min(5, priceHistory.length);
  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const idx = Math.round(
      (i / Math.max(tickCount - 1, 1)) * (priceHistory.length - 1),
    );
    return points[idx]!;
  });

  // Y-axis labels: min, mid, max
  const yLabels = [
    { value: maxPrice, y: PAD_TOP },
    { value: (minPrice + maxPrice) / 2, y: PAD_TOP + CHART_H / 2 },
    { value: minPrice, y: PAD_TOP + CHART_H },
  ];

  return (
    <section aria-label="Price history">
      <h3 className="mb-3 font-display text-xs uppercase tracking-widest text-content-muted">
        Price History
      </h3>
      <div className="rounded-lg border border-stroke-base bg-surface-elevated p-2">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          aria-label="Price history line chart"
          role="img"
        >
          {/* ── Grid lines ── */}
          {yLabels.map((label) => (
            <line
              key={`grid-${label.value}`}
              x1={PAD_LEFT}
              y1={label.y}
              x2={VIEW_W - PAD_RIGHT}
              y2={label.y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-stroke-base opacity-40"
              strokeDasharray="3 3"
            />
          ))}

          {/* ── Area fill ── */}
          <path d={areaPath} fill="url(#priceGradient)" opacity="0.2" />

          {/* ── Line ── */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="text-veil-400"
          />

          {/* ── Data points (dots) ── */}
          {points.map((pt) => (
            <circle
              key={`dot-${pt.ts}`}
              cx={pt.x}
              cy={pt.y}
              r="2"
              fill="currentColor"
              className="text-veil-400"
            />
          ))}

          {/* ── Y-axis labels ── */}
          {yLabels.map((label) => (
            <text
              key={`ylabel-${label.value}`}
              x={PAD_LEFT - 4}
              y={label.y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="7"
              fill="currentColor"
              className="text-content-muted"
              opacity="0.7"
            >
              {label.value.toFixed(2)}
            </text>
          ))}

          {/* ── X-axis labels ── */}
          {xTicks.map((pt) => (
            <text
              key={`xlabel-${pt.ts}`}
              x={pt.x}
              y={VIEW_H - 6}
              textAnchor="middle"
              fontSize="7"
              fill="currentColor"
              className="text-content-muted"
              opacity="0.7"
            >
              {formatDate(pt.ts)}
            </text>
          ))}

          {/* ── Gradient definition ── */}
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
}
