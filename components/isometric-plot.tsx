'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const VIEW_W = 500
const VIEW_H = 400

const WALL = { x: 25, y: 25, w: 450, h: 350 }
const ROAD_GREY = '#9CA3AF'
const PLOT_FILL = '#E8DCC4'
const PLOT_STROKE = '#C9B896'
const CRIMSON = '#DC143C'
const TREE_FILL = '#2D5A3D'

/** Layout in viewBox coordinates — roads split left / top-right / bottom-right park */
const ROADS = {
  hTop: { x: 38, y: 105, w: 424, h: 23 },
  hBot: { x: 38, y: 278, w: 424, h: 23 },
  vRight: { x: 332, y: 128, w: 25, h: 150 },
}

type PlotDef = { n: number; x: number; y: number; w: number; h: number }

function buildPlots(): PlotDef[] {
  const leftX: [number, number, number] = [38, 136, 234]
  const colW = 98
  const topY1 = 38
  const topH = 33.5
  const topY2 = 71.5
  const botY1 = 301
  const botH = 30.5
  const botY2 = 331.5
  const tw = 52.5
  const trx: [number, number] = [357, 409.5]

  const plots: PlotDef[] = []
  let n = 1
  const push = (x: number, y: number, w: number, h: number) => {
    plots.push({ n, x, y, w, h })
    n += 1
  }

  for (let row = 0; row < 2; row++) {
    const y = row === 0 ? topY1 : topY2
    for (let c = 0; c < 3; c++) push(leftX[c], y, colW, topH)
  }

  for (let row = 0; row < 2; row++) {
    const y = row === 0 ? botY1 : botY2
    for (let c = 0; c < 3; c++) push(leftX[c], y, colW, botH)
  }

  for (let row = 0; row < 2; row++) {
    const y = row === 0 ? topY1 : topY2
    for (let c = 0; c < 2; c++) push(trx[c], y, tw, topH)
  }

  return plots
}

const PLOTS = buildPlots()

function treePositions(): { cx: number; cy: number }[] {
  const pad = 12
  const trees: { cx: number; cy: number }[] = []
  const step = 42
  for (let x = WALL.x + pad; x <= WALL.x + WALL.w - pad; x += step) {
    trees.push({ cx: x, cy: WALL.y + 8 })
    trees.push({ cx: x, cy: WALL.y + WALL.h - 8 })
  }
  for (let y = WALL.y + 40; y <= WALL.y + WALL.h - 40; y += step) {
    trees.push({ cx: WALL.x + 8, cy: y })
    trees.push({ cx: WALL.x + WALL.w - 8, cy: y })
  }
  return trees
}

const TREES = treePositions()

type TooltipState = { x: number; y: number }

interface IsometricPlotProps {
  className?: string
  onOwnerPlotClick?: () => void
}

export function IsometricPlot({ className = '', onOwnerPlotClick }: IsometricPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    if (!tooltip) return
    const close = () => setTooltip(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [tooltip])

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: VIEW_W / 2, y: VIEW_H / 2 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: VIEW_W / 2, y: VIEW_H / 2 }
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const handlePlotClick = (e: React.MouseEvent, plotNum: number) => {
    e.stopPropagation()
    if (plotNum === 7) {
      setTooltip(null)
      onOwnerPlotClick?.()
      return
    }
    const { x, y } = svgPoint(e.clientX, e.clientY)
    setTooltip({ x: x + 8, y: y - 8 })
  }

  const park = { x: 357, y: 301, w: 105, h: 61 }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={`w-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      onClick={() => setTooltip(null)}
    >
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#F8F6F3" rx="8" />

      {/* Compound wall */}
      <rect
        x={WALL.x}
        y={WALL.y}
        width={WALL.w}
        height={WALL.h}
        fill="#F8F6F3"
        stroke="#454545"
        strokeWidth="7"
      />

      {/* Trees — green belt */}
      {TREES.map((t, i) => (
        <circle key={`tree-${i}`} cx={t.cx} cy={t.cy} r={4.5} fill={TREE_FILL} />
      ))}

      {/* Middle open band (left of vertical road) */}
      <rect x="38" y="128" width="294" height="150" fill="#EDEFE8" opacity="0.95" />

      {/* Roads */}
      <rect x={ROADS.hTop.x} y={ROADS.hTop.y} width={ROADS.hTop.w} height={ROADS.hTop.h} fill={ROAD_GREY} />
      <text
        x={ROADS.hTop.x + ROADS.hTop.w / 2}
        y={ROADS.hTop.y + ROADS.hTop.h / 2 + 4}
        textAnchor="middle"
        fill="#FAFAFA"
        fontSize="11"
        fontWeight="600"
        style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
      >
        40 Feet Road
      </text>

      <rect x={ROADS.hBot.x} y={ROADS.hBot.y} width={ROADS.hBot.w} height={ROADS.hBot.h} fill={ROAD_GREY} />
      <text
        x={ROADS.hBot.x + ROADS.hBot.w / 2}
        y={ROADS.hBot.y + ROADS.hBot.h / 2 + 4}
        textAnchor="middle"
        fill="#FAFAFA"
        fontSize="11"
        fontWeight="600"
        style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
      >
        Main Road
      </text>

      <rect
        x={ROADS.vRight.x}
        y={ROADS.vRight.y}
        width={ROADS.vRight.w}
        height={ROADS.vRight.h}
        fill={ROAD_GREY}
      />
      <text
        x={ROADS.vRight.x + ROADS.vRight.w / 2}
        y={ROADS.vRight.y + ROADS.vRight.h / 2}
        textAnchor="middle"
        fill="#FAFAFA"
        fontSize="10"
        fontWeight="600"
        transform={`rotate(-90, ${ROADS.vRight.x + ROADS.vRight.w / 2}, ${ROADS.vRight.y + ROADS.vRight.h / 2})`}
        style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
      >
        Main Road
      </text>

      {/* Plots */}
      {PLOTS.map((p) => {
        const isOwner = p.n === 7
        return (
          <g key={p.n}>
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              fill={isOwner ? CRIMSON : PLOT_FILL}
              stroke={PLOT_STROKE}
              strokeWidth="1"
              className="cursor-pointer"
              onClick={(e) => handlePlotClick(e, p.n)}
            />
            {isOwner ? (
              <>
                <text
                  x={p.x + p.w / 2}
                  y={p.y + p.h / 2 - 2}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="13"
                  fontWeight="700"
                  pointerEvents="none"
                  style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                >
                  {p.n}
                </text>
                <text
                  x={p.x + p.w / 2}
                  y={p.y + p.h / 2 + 10}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="8"
                  fontWeight="700"
                  pointerEvents="none"
                  style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
                >
                  VZG-047
                </text>
              </>
            ) : (
              <text
                x={p.x + p.w / 2}
                y={p.y + p.h / 2 + 4}
                textAnchor="middle"
                fill="#3F3F3F"
                fontSize="11"
                fontWeight="500"
                pointerEvents="none"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {p.n}
              </text>
            )}
          </g>
        )
      })}

      {/* Children Park */}
      <rect x={park.x} y={park.y} width={park.w} height={park.h} fill="#2D5A3D" opacity="0.85" stroke="#1F4029" strokeWidth="1" />
      <text
        x={park.x + park.w / 2}
        y={park.y + park.h / 2 + 4}
        textAnchor="middle"
        fill="#FAFAFA"
        fontSize="11"
        fontWeight="600"
        pointerEvents="none"
        style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
      >
        Children Park
      </text>

      {/* Private tooltip */}
      {tooltip && (
        <g pointerEvents="none" onClick={(e) => e.stopPropagation()}>
          <rect
            x={tooltip.x}
            y={tooltip.y - 22}
            width="168"
            height="26"
            rx="4"
            fill="#FFFFFF"
            stroke="#E5E5E5"
            strokeWidth="1"
          />
          <text
            x={tooltip.x + 84}
            y={tooltip.y - 5}
            textAnchor="middle"
            fill="#737373"
            fontSize="10"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            Owner details are private
          </text>
        </g>
      )}
    </svg>
  )
}
