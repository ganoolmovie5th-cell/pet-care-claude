// ponytail: SVG bar chart — no chart lib needed for 6 static bars
type Bar = { month: string; amount: number };

export default function EarningsChart({ data }: { data: Bar[] }) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.amount), 1);
  const HEIGHT = 120;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-gray-700">Pendapatan 6 Bulan Terakhir</p>
      <svg
        viewBox={`0 0 ${data.length * 48} ${HEIGHT + 24}`}
        className="w-full"
        aria-label="Grafik pendapatan 6 bulan"
      >
        {data.map((bar, i) => {
          const barH = (bar.amount / max) * HEIGHT;
          const x = i * 48 + 8;
          return (
            <g key={bar.month}>
              <rect
                x={x}
                y={HEIGHT - barH}
                width={32}
                height={barH}
                rx={4}
                className="fill-blue-500"
              />
              <text
                x={x + 16}
                y={HEIGHT + 16}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize={10}
              >
                {bar.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
