'use client';

/**
 * Reusable D3 treemap heatmap component.
 * Used in: FloorSheet Filter, and any other filter/analysis page.
 *
 * Tile size   → proportional to `value`
 * Tile color  → netPct (-1..1): positive=green (buy pressure), negative=red (sell pressure)
 * Click tile  → onSelect(symbol) fires; parent handles drill-down
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface MapTile {
  symbol: string;
  value: number;    // determines tile size (e.g. traded quantity, turnover)
  netPct: number;   // -1..1: buy/sell pressure that drives color intensity
  sub: string;      // short sub-label shown under symbol (e.g. "128k qty")
}

interface Props {
  data: MapTile[];
  selectedSymbol?: string | null;
  onSelect?: (symbol: string) => void;
  label?: string;
}

function tileColor(netPct: number): string {
  const abs = Math.abs(netPct);
  const alpha = (0.08 + abs * 0.40).toFixed(2);
  if (netPct >  0.08) return `rgba(52,211,153,${alpha})`;   // --color-up
  if (netPct < -0.08) return `rgba(248,113,113,${alpha})`;  // --color-down
  return 'rgba(251,191,36,0.12)';                            // --color-neutral
}

function textColor(netPct: number): string {
  if (netPct >  0.08) return '#34d399';
  if (netPct < -0.08) return '#f87171';
  return '#fbbf24';
}

export default function Treemap({ data, selectedSymbol, onSelect, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef  = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!wrapRef.current || !svgRef.current || !data.length) return;

    const W = wrapRef.current.clientWidth;
    const H = wrapRef.current.clientHeight;
    if (W <= 0 || H <= 0) return;

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    svg.selectAll('*').remove();

    const root = d3.hierarchy<{ name: string; children?: MapTile[] }>({
      name: 'root',
      children: data,
    })
      .sum(d => (d as unknown as MapTile).value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<{ name: string; children?: MapTile[] }>()
      .size([W, H])
      .padding(2)
      .paddingInner(2)
      (root);

    type Leaf = d3.HierarchyRectangularNode<{ name: string; children?: MapTile[] }>;
    const leaves = root.leaves() as Leaf[];

    const cell = svg.selectAll<SVGGElement, Leaf>('g')
      .data(leaves)
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .style('cursor', onSelect ? 'pointer' : 'default')
      .on('click', (_, d) => {
        const tile = d.data as unknown as MapTile;
        onSelect?.(tile.symbol);
      });

    // Background
    cell.append('rect')
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 3)
      .attr('fill',         d => tileColor((d.data as unknown as MapTile).netPct))
      .attr('stroke',       d => (d.data as unknown as MapTile).symbol === selectedSymbol ? 'var(--accent)' : 'rgba(42,42,50,0.5)')
      .attr('stroke-width', d => (d.data as unknown as MapTile).symbol === selectedSymbol ? 2 : 0.5);

    // Selected highlight overlay
    cell.filter(d => (d.data as unknown as MapTile).symbol === selectedSymbol)
      .append('rect')
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('rx', 3)
      .attr('fill', 'rgba(99,102,241,0.08)')
      .attr('pointer-events', 'none');

    // Symbol label
    cell.filter(d => (d.x1 - d.x0) > 28 && (d.y1 - d.y0) > 16)
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)
      .attr('y', d => (d.y1 - d.y0) / 2 - ((d.y1 - d.y0) > 30 ? 6 : 0))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', d => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        return `${Math.max(8, Math.min(w / 5, h / 2.5, 14))}px`;
      })
      .attr('font-weight', '700')
      .attr('fill', d => textColor((d.data as unknown as MapTile).netPct))
      .attr('pointer-events', 'none')
      .text(d => (d.data as unknown as MapTile).symbol);

    // Sub label
    cell.filter(d => (d.x1 - d.x0) > 38 && (d.y1 - d.y0) > 30)
      .append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)
      .attr('y', d => (d.y1 - d.y0) / 2 + 8)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '8px')
      .attr('fill', 'rgba(255,255,255,0.45)')
      .attr('pointer-events', 'none')
      .text(d => (d.data as unknown as MapTile).sub);

  }, [data, selectedSymbol, onSelect]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {label && (
        <div style={{
          padding: '5px 8px',
          fontSize: 10, fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}>
          {label}
        </div>
      )}
      <div ref={wrapRef} style={{ flex: 1, overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ display: 'block' }} />
      </div>
    </div>
  );
}
