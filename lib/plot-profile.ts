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

export function getPlotProfile(plotNumber: number) {
  const marks = (BODUVALASA_LAYOUT as any).plotMarks ?? (BODUVALASA_LAYOUT as any).plots ?? []
  const mark = marks.find((item: any) => item.n === plotNumber)
  const extent = mark?.extent ?? BODUVALASA_LAYOUT.plotExtents.find((item) => item.plot === plotNumber)?.extentSqYards
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
    : 'Road facing'

  const roadAccess = mark
    ? mark.y < 120 || mark.y > 450
      ? 'Primary layout road'
      : mark.x > 500 || mark.x < 80
        ? 'Edge road access'
        : 'Internal plotted road'
    : 'Internal plotted road'

  return {
    plotNumber,
    ownerName: OWNER_NAMES[plotNumber % OWNER_NAMES.length],
    facing,
    roadAccess,
    extent: extent ? `${extent.toLocaleString('en-IN')} sq yards` : 'Survey extent pending',
    status: STATUS[plotNumber % STATUS.length],
  }
}
