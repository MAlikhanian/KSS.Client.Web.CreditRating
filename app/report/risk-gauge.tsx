'use client';

import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface RiskGaugeProps {
  score: number | null | undefined;
  tier: string | null | undefined;
  width?: number;
}

const TIER_ORDER = ['A1','A2','A3','B1','B2','B3','C1','C2','C3','D1','D2','D3'];

// User-selected colors — light/medium/dark per group
const GAUGE_COLORS: Record<string, string> = {
  A1: '#4ade80', A2: '#22c55e', A3: '#16a34a',  // green-400/500/600
  B1: '#60a5fa', B2: '#3b82f6', B3: '#2563eb',  // blue-400/500/600
  C1: '#fef08a', C2: '#fde047', C3: '#facc15',  // yellow-200/300/400
  D1: '#ef4444', D2: '#dc2626', D3: '#b91c1c',  // red-500/600/700
};


export function tierColor(tier: string | null | undefined): string {
  if (!tier) return '#94a3b8';
  return GAUGE_COLORS[tier] ?? '#94a3b8';
}

export function RiskGauge({ score, tier, width = 440 }: RiskGaugeProps) {
  const s = Math.max(0, Math.min(100, score ?? 0));
  const color = tierColor(tier);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'radialBar',
      offsetY: -20,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 0,
          size: '68%',
          background: 'transparent',
        },
        track: {
          background: '#e2e8f0',
          strokeWidth: '100%',
          margin: 2,
        },
        dataLabels: {
          name: {
            show: true,
            offsetY: -12,
            fontSize: '20px',
            fontWeight: 800,
            color: color,
          },
          value: {
            show: true,
            offsetY: 12,
            fontSize: '34px',
            fontWeight: 800,
            color: color,
            formatter: (( // eslint-disable-next-line @typescript-eslint/no-unused-vars
_n: number) =>
              score !== null && score !== undefined
                ? new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(score)
                : '—') as (val: number) => string,
          },
        },
      },
    },
    // Solid fill — exactly the current tier color.
    // e.g. B2 (score 42.5) → blue-500 only, not a multi-color gradient.
    fill: {
      type: 'solid',
      colors: [color],
    },
    stroke: { lineCap: 'round' },
    labels: [tier ?? '—'],
  };

  return (
    <div style={{ width, margin: '0 auto' }}>
      <ReactApexChart
        type="radialBar"
        series={[s]}
        options={options}
        height={Math.round(width * 0.8)}
        width={width}
      />

      {/* Tier strip — LTR: A1 left, D3 right */}
      <div dir="ltr" className="flex mx-4 gap-0.5">
        {TIER_ORDER.map((t) => (
          <div
            key={t}
            title={t}
            style={{
              flex: 1,
              backgroundColor: GAUGE_COLORS[t],
              height: t === tier ? 20 : 14,
              borderRadius: 4,
              outline: t === tier ? `2px solid ${GAUGE_COLORS[t]}` : 'none',
              outlineOffset: 2,
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>

      {/* Tier labels under strip */}
      <div dir="ltr" className="flex mt-1.5 px-4">
        {TIER_ORDER.map((t) => (
          <div
            key={t}
            style={{ flex: 1, textAlign: 'center', color: GAUGE_COLORS[t] }}
            className={`text-[9px] font-mono font-bold ${
              t === tier ? 'opacity-100' : 'opacity-60'
            }`}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
