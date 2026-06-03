import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Sparkles, ThumbsUp, ThumbsDown,
  Minus, TrendingUp, TrendingDown, Star, BarChart3,
  Hash, Tag, RefreshCw, Activity, PieChart
} from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '../ui/Button'
import { Alert, Spinner } from '../ui/index'
import { Badge } from '../ui/Badge'
import { cn } from '../../utils/formatters'
import { aiService } from '../../services/aiService'

function SentimentCard({ result }) {
  const cfg = {
    positive: { color: 'text-emerald-700', bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200', icon: <ThumbsUp size={20} className="text-emerald-600" />, label: 'Positive' },
    negative: { color: 'text-red-700', bg: 'from-red-50 to-rose-50', border: 'border-red-200', icon: <ThumbsDown size={20} className="text-red-600" />, label: 'Negative' },
    neutral:  { color: 'text-slate-700', bg: 'from-slate-50 to-gray-50', border: 'border-slate-200', icon: <Minus size={20} className="text-slate-500" />, label: 'Neutral' },
  }[result.sentiment] || { color: 'text-slate-700', bg: 'from-slate-50 to-gray-50', border: 'border-slate-200', icon: <Minus size={20} className="text-slate-500" />, label: 'Neutral' }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('rounded-2xl border p-5 bg-gradient-to-br space-y-4', cfg.bg, cfg.border)}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/80 shadow-sm">{cfg.icon}</div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Sentiment Analysis</p>
          <p className={cn('text-2xl font-black', cfg.color)}>{cfg.label} Feedback</p>
        </div>
        <div className="ml-auto">
          <div className="text-right">
            <p className={cn('text-3xl font-black font-data', cfg.color)}>{result.confidence}%</p>
            <p className="text-xs text-[var(--color-text-muted)]">confidence</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-[var(--color-text-primary)] bg-white/50 p-3 rounded-xl">{result.summary}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingUp size={10} /> Positive Themes</p>
          <div className="flex flex-wrap gap-1.5">
            {result.positive_themes?.map(t => (
              <span key={t} className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-medium">{t}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingDown size={10} /> Negative Themes</p>
          <div className="flex flex-wrap gap-1.5">
            {result.negative_themes?.map(t => (
              <span key={t} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-lg font-medium">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 flex items-center gap-1"><Hash size={10} /> Key Topics</p>
        <div className="flex flex-wrap gap-1.5">
          {result.key_topics?.map(t => (
            <span key={t} className="text-xs px-2.5 py-1 bg-white/80 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg font-medium">{t}</span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function FeedbackAnalytics() {
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('consultation')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true)
      const data = await aiService.getFeedbackAnalytics()
      if (data) setStats(data)
      setStatsLoading(false)
    }
    fetchStats()
  }, [])

  const handleAnalyze = async () => {
    if (!feedback.trim()) return
    try {
      setLoading(true)
      const analysis = await aiService.analyzeFeedback(feedback)
      setResult(analysis)
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Patient Feedback Analytics</h1>
        <p className="text-[var(--color-text-secondary)] mt-0.5">AI-powered sentiment analysis for healthcare interactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 relative overflow-hidden">
          {statsLoading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center"><Spinner size="sm" /></div>}
          <h3 className="font-bold text-[var(--color-text-primary)] mb-4">Overall Satisfaction</h3>
          <div className="flex flex-col items-center justify-center h-48">
            <span className="text-5xl font-black text-[var(--color-text-primary)] font-data">
              {stats ? stats.overall_satisfaction : '--'}
            </span>
            <span className="text-sm font-semibold text-emerald-600 mt-2">out of 100</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col items-center relative h-[268px]">
          {statsLoading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center"><Spinner size="sm" /></div>}
          <h3 className="font-bold text-[var(--color-text-primary)] mb-4 w-full text-left">Sentiment Distribution</h3>
          {stats ? (
            <div className="w-full flex-1 flex flex-col justify-center gap-4">
              <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Positive</span>
                <span className="font-bold font-data text-emerald-800 dark:text-emerald-300">{stats.distribution.positive}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-medium text-slate-700 dark:text-slate-400">Neutral</span>
                <span className="font-bold font-data text-slate-800 dark:text-slate-300">{stats.distribution.neutral}</span>
              </div>
              <div className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                <span className="font-medium text-red-700 dark:text-red-400">Negative</span>
                <span className="font-bold font-data text-red-800 dark:text-red-300">{stats.distribution.negative}</span>
              </div>
            </div>
          ) : (
            <>
              <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2 mt-auto" />
              <p className="text-slate-500 font-medium mb-auto">No sentiment data yet</p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col items-center justify-center h-[268px]">
          <h3 className="font-bold text-[var(--color-text-primary)] mb-4 w-full text-left">Sentiment Trend</h3>
          <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-slate-500 font-medium text-center">Trend chart requires more historical data</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col items-center relative min-h-[200px]">
          {statsLoading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center"><Spinner size="sm" /></div>}
          <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-4 flex items-center gap-2 w-full text-left">
            <TrendingDown size={18} className="text-red-500" /> Top Complaints
          </h3>
          {stats?.top_complaints?.length > 0 ? (
            <ul className="w-full space-y-3">
              {stats.top_complaints.map((c, i) => (
                <li key={i} className="bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800/50 text-sm font-medium">
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 font-medium my-auto">No complaints recorded</p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col items-center relative min-h-[200px]">
          {statsLoading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center"><Spinner size="sm" /></div>}
          <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-4 flex items-center gap-2 w-full text-left">
            <TrendingUp size={18} className="text-emerald-500" /> Top Appreciations
          </h3>
          {stats?.top_appreciations?.length > 0 ? (
            <ul className="w-full space-y-3">
              {stats.top_appreciations.map((a, i) => (
                <li key={i} className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 text-sm font-medium">
                  {a}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 font-medium my-auto">No appreciations recorded</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <h3 className="font-bold text-lg text-[var(--color-text-primary)] flex items-center gap-2">
          <MessageSquare size={18} className="text-[var(--color-primary)]" /> Analyze New Feedback
        </h3>

        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'consultation', label: 'Doctor Consultation' },
            { id: 'hospital',     label: 'Hospital Visit' },
            { id: 'ai',           label: 'AI Interaction' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFeedbackType(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                feedbackType === t.id
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Paste patient feedback here..."
          className="w-full min-h-[120px] px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
        />

        <Button
          onClick={handleAnalyze}
          isLoading={loading}
          disabled={!feedback.trim()}
          leftIcon={<Sparkles size={16} />}
          className="w-full sm:w-auto"
        >
          Analyze Sentiment with AI
        </Button>

        <AnimatePresence>
          {result && <SentimentCard result={result} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
