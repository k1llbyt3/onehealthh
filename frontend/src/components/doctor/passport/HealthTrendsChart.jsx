import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Dot
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'

// Color mapping for status
const STATUS_COLORS = {
  normal: { dot: '#10b981', line: '#10b981', fill: '#10b98120', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  high: { dot: '#f59e0b', line: '#f59e0b', fill: '#f59e0b20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { dot: '#3b82f6', line: '#3b82f6', fill: '#3b82f620', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  critical: { dot: '#ef4444', line: '#ef4444', fill: '#ef444420', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const PARAM_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
]

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const status = p.payload?.status
  const color = STATUS_COLORS[status] || STATUS_COLORS.normal
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 min-w-[160px]">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {p.value} <span className="text-sm font-normal text-slate-400">{p.payload?.unit}</span>
      </p>
      {status && (
        <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.badge}`}>
          {status}
        </span>
      )}
      {p.payload?.refRange && (
        <p className="text-[10px] text-slate-400 mt-1">Ref: {p.payload.refRange}</p>
      )}
    </div>
  )
}

// Custom dot with status color
function StatusDot(props) {
  const { cx, cy, payload } = props
  const status = payload?.status
  const color = STATUS_COLORS[status]?.dot || '#6366f1'
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />
    </g>
  )
}

function TrendBadge({ data }) {
  if (data.length < 2) return null
  const first = data[0]?.value
  const last = data[data.length - 1]?.value
  const diff = ((last - first) / (first || 1)) * 100
  if (Math.abs(diff) < 1) return <span className="flex items-center gap-1 text-xs text-slate-400"><Minus className="w-3 h-3" /> Stable</span>
  if (diff > 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
      <TrendingUp className="w-3 h-3" /> +{diff.toFixed(1)}%
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
      <TrendingDown className="w-3 h-3" /> {diff.toFixed(1)}%
    </span>
  )
}

export function HealthTrendsChart({ timeline }) {
  // Extract all unique health parameters from all records
  const { paramMap, paramList } = useMemo(() => {
    const map = {}
    if (!timeline?.length) return { paramMap: {}, paramList: [] }

    const sorted = [...timeline].sort((a, b) => new Date(a.date) - new Date(b.date))

    sorted.forEach(item => {
      if (item.type !== 'record') return
      const extracted = item.data?.ai_analysis?.extracted_values
      if (!extracted?.length) return

      const dateLabel = new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit' })
      const reportTitle = item.data?.title || 'Report'

      extracted.forEach(({ parameter, value, unit, status, reference_range }) => {
        const numVal = parseFloat(value)
        if (isNaN(numVal)) return
        if (!map[parameter]) map[parameter] = { name: parameter, unit: unit || '', data: [] }
        map[parameter].data.push({
          date: dateLabel,
          value: numVal,
          unit: unit || '',
          status: status || 'normal',
          refRange: reference_range || '',
          report: reportTitle
        })
      })
    })

    return { paramMap: map, paramList: Object.keys(map) }
  }, [timeline])

  const [activeParam, setActiveParam] = useState(() => paramList[0] || null)
  const [showAll, setShowAll] = useState(false)

  // Update activeParam when paramList changes
  React.useEffect(() => {
    if (paramList.length > 0 && !paramList.includes(activeParam)) {
      setActiveParam(paramList[0])
    }
  }, [paramList])

  const displayedParams = showAll ? paramList : paramList.slice(0, 8)

  if (paramList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
        <h4 className="font-bold text-slate-600 dark:text-slate-400">No Health Data Available</h4>
        <p className="text-slate-400 text-sm mt-1 max-w-xs">Upload lab reports with extracted values to see trends here.</p>
      </div>
    )
  }

  const activeData = activeParam ? paramMap[activeParam] : null
  const latest = activeData?.data?.[activeData.data.length - 1]
  const latestStatus = latest?.status || 'normal'
  const statusColor = STATUS_COLORS[latestStatus] || STATUS_COLORS.normal
  const chartColor = PARAM_COLORS[paramList.indexOf(activeParam) % PARAM_COLORS.length]

  return (
    <div className="space-y-5">
      {/* Parameter Pills */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {displayedParams.map((param, idx) => {
            const pd = paramMap[param]
            const latestEntry = pd.data[pd.data.length - 1]
            const pStatus = latestEntry?.status || 'normal'
            const pColor = STATUS_COLORS[pStatus]
            const isActive = activeParam === param
            return (
              <button
                key={param}
                onClick={() => setActiveParam(param)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200
                  ${isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white/80' : pColor?.dot ? '' : 'bg-slate-300'}`}
                  style={!isActive ? { backgroundColor: pColor?.dot } : {}}
                />
                {param}
              </button>
            )
          })}
          {paramList.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:border-indigo-400 hover:text-indigo-500 transition-all"
            >
              {showAll ? 'Show less' : `+${paramList.length - 8} more`}
              <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <AnimatePresence mode="wait">
        {activeData && (
          <motion.div
            key={activeParam}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-lg">{activeParam}</h4>
                <div className="flex items-center gap-3 mt-1">
                  {latest && (
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {latest.value}
                      <span className="text-sm font-normal text-slate-400 ml-1">{activeData.unit}</span>
                    </span>
                  )}
                  {latest && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${statusColor.badge}`}>
                      {latestStatus === 'normal' && <CheckCircle2 className="w-3 h-3" />}
                      {(latestStatus === 'high' || latestStatus === 'critical') && <AlertTriangle className="w-3 h-3" />}
                      {latestStatus}
                    </span>
                  )}
                </div>
                {latest?.refRange && (
                  <p className="text-xs text-slate-400 mt-1">Normal range: {latest.refRange} {activeData.unit}</p>
                )}
              </div>
              <div className="text-right">
                <TrendBadge data={activeData.data} />
                <p className="text-[11px] text-slate-400 mt-1">{activeData.data.length} reading{activeData.data.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Recharts Line/Area Chart */}
            {activeData.data.length === 1 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-3"
                  style={{ background: `${chartColor}20`, border: `3px solid ${chartColor}` }}
                >
                  <span className="text-2xl font-extrabold" style={{ color: chartColor }}>{activeData.data[0].value}</span>
                </div>
                <p className="text-sm text-slate-500">Single reading on {activeData.data[0].date}</p>
                <p className="text-xs text-slate-400 mt-1">More data points needed to show trends</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activeData.data} margin={{ top: 10, right: 5, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id={`grad-${activeParam}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700/50" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={2.5}
                    fill={`url(#grad-${activeParam})`}
                    dot={<StatusDot />}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Parameters Summary Grid */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Latest Values — All Parameters</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {paramList.map((param) => {
            const pd = paramMap[param]
            const entry = pd.data[pd.data.length - 1]
            const pStatus = entry?.status || 'normal'
            const pColor = STATUS_COLORS[pStatus] || STATUS_COLORS.normal
            return (
              <button
                key={param}
                onClick={() => setActiveParam(param)}
                className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm
                  ${activeParam === param
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[80%]">{param}</span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: pColor.dot }} />
                </div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  {entry?.value ?? '—'}
                </p>
                <p className="text-[10px] text-slate-400">{pd.unit}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
