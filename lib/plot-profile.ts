import { BODUVALASA_LAYOUT } from '@/lib/boduvalasa-layout'

const OWNER_NAMES = [
  'Ravi Kumar',
  'Ananya Rao',
  'Suresh Varma',
  'Meera Iyer',
  'Kiran Reddy',
  'Priya Menon',
  'Arjun Naidu',
  'Lakshmi Devi',
  'Vikram Shah',
  'Nisha Patel',
  'Harish Gupta',
  'Deepa Singh',
]

const STATUS = ['Owner verified', 'Boundary check due', 'Document review', 'Inspection active']

type MappedPlotMark = {
  n: number
  x: number
  y: number
  extent?: number
  extentSqYards?: number
}

export function getMappedPlotMarks() {
  const layout = BODUVALASA_LAYOUT as typeof BODUVALASA_LAYOUT & {
    plotMarks?: readonly MappedPlotMark[]
    plots?: readonly MappedPlotMark[]
  }

  return [...(layout.plotMarks ?? layout.plots ?? [])].sort((a, b) => a.n - b.n)
}

export function getMappedPlotNumbers() {
  return getMappedPlotMarks().map((mark) => mark.n)
}

export function getPlotProfile(plotNumber: number) {
  const marks = getMappedPlotMarks()
  const mark = marks.find((item) => item.n === plotNumber)

  if (!mark) return null

  const extent =
    mark?.extent ??
    BODUVALASA_LAYOUT.plotExtents.find((item) => item.plot === plotNumber)?.extentSqYards ??
    mark?.extentSqYards
  const facing = mark
    ? mark.y < 120
      ? 'North facing'
      : mark.y > 450
        ? 'South facing'
        : mark.x > 470
          ? 'East facing'
          : mark.x < 120
            ? 'West facing'
            : 'Internal road facing'
    : 'Survey facing pending'

  const roadAccess = mark
    ? mark.y < 120 || mark.y > 450
      ? 'Primary layout road'
      : mark.x > 500 || mark.x < 80
        ? 'Edge road access'
        : 'Internal plotted road'
    : 'Survey access pending'

  return {
    plotNumber,
    ownerName: OWNER_NAMES[plotNumber % OWNER_NAMES.length],
    facing,
    roadAccess,
    extent: extent ? `${extent.toLocaleString('en-IN')} sq yards` : 'Survey extent pending',
    status: STATUS[plotNumber % STATUS.length],
  }
}
