import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import type { DailySeriesPoint } from '../types/analytics';

interface VisitorsChartProps {
  data: DailySeriesPoint[];
  title: string;
  subtitle?: string;
}

export const VisitorsChart: React.FC<VisitorsChartProps> = ({ data, title, subtitle }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const renderSvgChart = (heightPx: number, showAllLabels: boolean) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-56 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          Sem dados de visitantes no período selecionado.
        </div>
      );
    }

    const width = 760;
    const height = heightPx;
    const padL = 44;
    const padR = 16;
    const padT = 18;
    const padB = 28;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const maxVal = Math.max(
      10,
      ...data.map((d) => Math.max(d.visitors, d.previousVisitors)),
    );
    const niceMax = Math.ceil((maxVal * 1.15) / 10) * 10;

    const getX = (idx: number) => {
      if (data.length === 1) return padL + plotW / 2;
      return padL + (idx / (data.length - 1)) * plotW;
    };
    const getY = (val: number) => padT + plotH - (val / niceMax) * plotH;

    const currentPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.visitors).toFixed(1)}`).join(' ');
    const prevPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.previousVisitors).toFixed(1)}`).join(' ');

    const areaPath =
      data.length > 1
        ? `M ${getX(0).toFixed(1)},${(padT + plotH).toFixed(1)} ` +
          data.map((d, i) => `L ${getX(i).toFixed(1)},${getY(d.visitors).toFixed(1)}`).join(' ') +
          ` L ${getX(data.length - 1).toFixed(1)},${(padT + plotH).toFixed(1)} Z`
        : '';

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
    const labelStep = showAllLabels ? Math.max(1, Math.ceil(data.length / 12)) : Math.max(1, Math.ceil(data.length / 7));

    const activeIdx = hoveredIndex !== null && hoveredIndex < data.length ? hoveredIndex : null;
    const activePoint = activeIdx !== null ? data[activeIdx] : null;

    return (
      <div className="relative select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id="vitrineAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="1"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#vitrineAreaFill)" />}

          {/* Previous period comparison curve */}
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.75"
              strokeDasharray="4 4"
              points={prevPoints}
            />
          )}

          {/* Current period primary curve */}
          {data.length > 1 && (
            <polyline
              fill="none"
              className="stroke-blue-700 dark:stroke-blue-400"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={currentPoints}
            />
          )}

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % labelStep !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={d.date}
                x={getX(i)}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-medium"
              >
                {d.label}
              </text>
            );
          })}

          {/* Hover vertical guide & dots */}
          {activeIdx !== null && activePoint && (
            <line
              x1={getX(activeIdx)}
              y1={padT}
              x2={getX(activeIdx)}
              y2={padT + plotH}
              className="stroke-slate-300 dark:stroke-slate-700"
              strokeWidth="1"
            />
          )}

          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.visitors);
            const isActive = activeIdx === i;
            return (
              <g key={d.date}>
                {(isActive || data.length <= 14) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isActive ? 5 : 3}
                    className={
                      isActive
                        ? 'fill-blue-700 dark:fill-blue-400 stroke-blue-700 dark:stroke-blue-400'
                        : 'fill-white dark:fill-slate-900 stroke-blue-700 dark:stroke-blue-400'
                    }
                    strokeWidth="2"
                  />
                )}
                {/* Hit target */}
                <rect
                  x={cx - plotW / Math.max(data.length * 2, 2)}
                  y={padT}
                  width={Math.max(12, plotW / Math.max(data.length, 1))}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {activePoint && activeIdx !== null && (
          <div className="mt-2 px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs flex flex-wrap items-center justify-between gap-4">
            <span className="font-medium">
              {activePoint.label} ({activePoint.date})
            </span>
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <span>Atual: {activePoint.visitors.toLocaleString('pt-BR')} visitantes</span>
              <span className="text-slate-300">
                Anterior: {activePoint.previousVisitors.toLocaleString('pt-BR')}
              </span>
              <span className="text-emerald-300">
                Compras: {activePoint.purchases.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-700 dark:bg-blue-400 inline-block" aria-hidden="true" />
                Período atual
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block" aria-hidden="true" />
                Período anterior
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Expandir gráfico</span>
            </button>
          </div>
        </div>

        {renderSvgChart(240, false)}
      </div>

      {/* Expanded modal with full chart + daily tabular breakdown */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gráfico expandido de acessos"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visualização expandida com comparativo de período anterior e tabela diária
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Fechar gráfico expandido"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderSvgChart(300, true)}

            <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Dia / Data</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Visitantes</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Período Anterior</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Visualizações</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Compras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums font-mono text-xs">
                  {data.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                        {row.label} <span className="text-slate-400 dark:text-slate-500 font-normal">· {row.date}</span>
                      </td>
                      <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {row.visitors.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-500 dark:text-slate-400">
                        {row.previousVisitors.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-700 dark:text-slate-300">
                        {row.pageViews.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-4 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                        {row.purchases.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
