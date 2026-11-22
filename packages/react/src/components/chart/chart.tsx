import { Area }                  from 'recharts'
import { AreaChart }             from 'recharts'
import { Bar }                   from 'recharts'
import { BarChart }              from 'recharts'
import { CartesianGrid }         from 'recharts'
import { Line }                  from 'recharts'
import { LineChart }             from 'recharts'
import { XAxis }                 from 'recharts'
import { YAxis }                 from 'recharts'
// --------------------------------------------------------
import type { ChartConfig }      from '../../shadcn/chart'
import { ChartContainer }        from '../../shadcn/chart'
import { ChartLegend }           from '../../shadcn/chart'
import { ChartLegendContent }    from '../../shadcn/chart'
import { ChartTooltip }          from '../../shadcn/chart'
import { ChartTooltipContent }   from '../../shadcn/chart'

export type ChartSeries = {
  /** The field of each row it draws. */
  key: string
  label: string
}

type ChartProps = {
  /** `bar` compares, `line` follows a value in time, `area` adds a few in time. */
  kind: 'bar' | 'line' | 'area'
  /** One row per point on the x axis. */
  data: Record<string, string | number>[]
  /** The field of each row on the x axis: a day, a month, a name. */
  x: string
  series: ChartSeries[]
  /** What it shows, read by a screen reader. */
  label: string
}

// The theme's own colors, in this order: the same series is always the same color.
const COLORS = ['var(--brand)', 'var(--info)', 'var(--ok)', 'var(--warn)', 'var(--bad)']

const CHARTS = { bar: BarChart, line: LineChart, area: AreaChart }

/** Numbers across days or names, as bars, lines or areas, with their tooltip and legend. */
export function Chart({ kind, data, x, series, label }: ChartProps) {
  const config: ChartConfig = Object.fromEntries(series.map((each, index) => [each.key, { label: each.label, color: COLORS[index % COLORS.length] }]))
  const Drawn = CHARTS[kind]
  return (
    <ChartContainer config={config} className="min-h-60 w-full" role="img" aria-label={label}>
      <Drawn data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={x} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map(each => {
          const color = `var(--color-${each.key})`
          if (kind === 'bar') return <Bar key={each.key} dataKey={each.key} fill={color} radius={4} />
          if (kind === 'line') return <Line key={each.key} dataKey={each.key} stroke={color} strokeWidth={2} dot={false} type="monotone" />
          return <Area key={each.key} dataKey={each.key} stroke={color} fill={color} fillOpacity={0.2} type="monotone" stackId="stack" />
        })}
      </Drawn>
    </ChartContainer>
  )
}
