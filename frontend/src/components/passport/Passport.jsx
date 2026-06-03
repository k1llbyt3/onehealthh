import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  Search, Plus, Filter, ChevronRight, FileText, Pill,
  Stethoscope, Syringe, Activity, Eye, Trash2,
  UploadCloud, Calendar, User, Building2, X, StickyNote,
  TrendingUp, TrendingDown, Minus, Download, Sparkles, Info, AlertCircle,
  Copy, Check
} from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { useRecordsStore } from '../../store/recordsStore'
import { useUserStore } from '../../store/userStore'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Badge, RecordTypeBadge } from '../ui/Badge'
import { Avatar, ProgressBar, EmptyState, Alert } from '../ui/index'
import { useToast } from '../ui/Toast'
import { formatDate, formatRelative, getRecordTypeLabel, getHealthScoreConfig, cn } from '../../utils/formatters'

const RECORD_ICONS = {
  report:        <FileText size={18} />,
  prescription:  <Pill size={18} />,
  diagnosis:     <Stethoscope size={18} />,
  vaccination:   <Syringe size={18} />,
  symptom_check: <Activity size={18} />,
  treatment:     <Activity size={18} />,
  followup:      <Calendar size={18} />,
}

const ICON_BG = {
  report:       'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  prescription: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  diagnosis:    'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  vaccination:  'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  symptom_check:'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  followup:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

// --- Trend Chart Component ---
function ParameterTrend({ parameter, storeTrends }) {
  const paramKey = parameter?.toLowerCase()
  let trendData = []
  let color = '#3b82f6'

  if (paramKey?.includes('haemoglobin') || paramKey?.includes('hemoglobin')) {
    trendData = storeTrends.haemoglobin || []
    color = '#ef4444'
  } else if (paramKey?.includes('weight')) {
    trendData = storeTrends.weight || []
    color = '#10b981'
  } else if (paramKey?.includes('glucose') || paramKey?.includes('sugar')) {
    trendData = storeTrends.bloodSugar?.map(d => ({ date: d.date, value: d.fasting })) || []
    color = '#f59e0b'
  } else if (paramKey?.includes('cholesterol')) {
    trendData = storeTrends.cholesterol?.map(d => ({ date: d.date, value: d.total })) || []
    color = '#6366f1'
  }

  if (trendData.length < 2) return null

  const sorted = [...trendData].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
          <Activity size={14} className="text-blue-500" />
          {parameter} Trend
        </h4>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Insights</span>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sorted}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} 
              dy={10}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <ReTooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '8px' }}
              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}
              labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Upload Modal
function UploadModal({ isOpen, onClose }) {
  const [step, setStep] = useState('idle') // idle | uploading | done
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({ type: 'report', date: '', doctor: '', hospital: '', notes: '' })
  const saveRecord = useRecordsStore(s => s.saveRecord)
  const user = useAuthStore(s => s.user)
  const toast = useToast()

  const onDrop = useCallback((accepted) => {
    setFiles(accepted)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStep('uploading')

    try {
      const newRecord = {
        id: `rec-${Date.now()}`,
        type: form.type,
        date: form.date || new Date().toISOString().split('T')[0],
        title: files[0]?.name || `${getRecordTypeLabel(form.type)} Record`,
        metadata: { doctor_name: form.doctor, hospital: form.hospital, notes: form.notes },
        ai_analysis: null,
      }
      
      // Save directly to Firestore using store action
      await saveRecord(user?.uid, newRecord)
      
      setStep('done')
      toast.success('Record Added', 'Your health record has been added to your passport.')
      setTimeout(() => { 
        setStep('idle'); 
        setFiles([]); 
        setForm({ type: 'report', date: '', doctor: '', hospital: '', notes: '' }); 
        onClose() 
      }, 1000)
    } catch(err) {
      console.error(err)
      setStep('idle')
      toast.error('Upload Failed', err.message || 'Something went wrong')
    }
  }

  const uploading = step === 'uploading'
  const done = step === 'done'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Health Record" description="Upload a medical record to your Health Passport." size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">Record Type <span className="text-[var(--color-danger)]">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'report', label: 'Lab Report', icon: <FileText size={14} /> },
              { id: 'prescription', label: 'Prescription', icon: <Pill size={14} /> },
              { id: 'diagnosis', label: 'Diagnosis', icon: <Stethoscope size={14} /> },
              { id: 'vaccination', label: 'Vaccination', icon: <Syringe size={14} /> },
              { id: 'treatment', label: 'Treatment', icon: <Activity size={14} /> },
              { id: 'followup', label: 'Follow-Up', icon: <Calendar size={14} /> },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t.id }))}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                  form.type === t.id
                    ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div
          {...getRootProps()}
          className={cn(
            'relative rounded-xl border-2 border-dashed transition-all cursor-pointer p-8 text-center',
            isDragActive
              ? 'border-[var(--color-primary)] bg-blue-50'
              : files.length
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface-2)]'
          )}
        >
          <input {...getInputProps()} />
          {files.length ? (
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-100">
                <FileText size={24} className="text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{files[0].name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{(files[0].size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
          ) : (
            <div>
              <UploadCloud size={36} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {isDragActive ? 'Drop your file here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">PDF, JPG, PNG · Max 20 MB</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Date of Record" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Doctor Name" placeholder="Dr. Smith" value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} />
        </div>
        <Input label="Hospital / Lab" placeholder="City Hospital" value={form.hospital} onChange={e => setForm(f => ({ ...f, hospital: e.target.value }))} />
        <Input label="Notes (Optional)" placeholder="Any additional details..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

        {uploading && (
          <div className="space-y-2">
            <ProgressBar value={75} color="primary" label="Uploading..." showPercent />
          </div>
        )}

        {done && (
          <Alert type="success" title="Record saved successfully!">
            Your record has been added to your Health Passport.
          </Alert>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" isLoading={uploading} disabled={done}>
            {done ? 'Saved!' : 'Upload & Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Record Detail Modal
function RecordDetail({ record, isOpen, onClose }) {
  const storeTrends = useRecordsStore(s => s.trends)
  if (!record) return null
  const ai = record.ai_analysis

  const statusConfig = {
    normal:   { label: 'Normal',   color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10', icon: <Minus size={12} /> },
    high:     { label: 'High ↑',   color: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-500/10',         icon: <TrendingUp size={12} /> },
    low:      { label: 'Low ↓',    color: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10',       icon: <TrendingDown size={12} /> },
    critical: { label: 'Critical', color: 'text-red-900 bg-red-100 dark:text-red-300 dark:bg-red-500/20',        icon: <TrendingUp size={12} /> },
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={record.title} size="lg">
      <div className="p-6 space-y-6">
        {/* Meta */}
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">{formatDate(record.date)}</span>
          </div>
          {record.metadata?.doctor_name && (
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{record.metadata.doctor_name}</span>
            </div>
          )}
          {record.metadata?.hospital && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 size={14} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{record.metadata.hospital}</span>
            </div>
          )}
          <RecordTypeBadge type={record.type} />
        </div>

        {/* AI Analysis */}
        {ai && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white">AI Clinical Insights</h3>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-purple-900/20 dark:via-[#0b1120] dark:to-blue-900/20 border border-purple-100 dark:border-purple-800/30 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2">
                 <div className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest border border-purple-500/20">Verified Insight</div>
               </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{ai.summary}</p>
            </div>

            {ai.extracted_values?.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Biometric Parameters</h4>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Info size={10} /> Reference ranges based on profile
                  </div>
                </div>
                
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          {['Parameter', 'Result', 'Reference', 'Status'].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ai.extracted_values.map((v, i) => {
                          const s = statusConfig[v.status] || statusConfig.normal
                          return (
                            <tr key={i} className="bg-white dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-5 py-4">
                                <span className="font-bold text-slate-900 dark:text-slate-200">{v.parameter}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col">
                                  <span className="font-data font-black text-slate-900 dark:text-white text-base">{v.value} {v.unit}</span>
                                  <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                     <div 
                                      className={cn('h-full rounded-full transition-all duration-1000', 
                                        v.status === 'normal' ? 'bg-emerald-500 w-[60%]' : 
                                        v.status === 'high' ? 'bg-red-500 w-[85%]' : 
                                        v.status === 'low' ? 'bg-blue-500 w-[25%]' : 'bg-red-700 w-[95%]'
                                      )} 
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-500">{v.reference_range}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider', s.color)}>
                                  {s.icon} {s.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {ai.extracted_values.slice(0, 1).map((v, i) => (
                   <ParameterTrend key={i} parameter={v.parameter} storeTrends={storeTrends} />
                ))}
              </div>
            )}

            {ai.suggested_actions?.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                  <AlertCircle size={14} /> Immediate Recommendations
                </h4>
                <ul className="space-y-3">
                  {ai.suggested_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-200 font-medium">
                      <div className="w-5 h-5 rounded-lg bg-blue-600 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-black">
                        {i + 1}
                      </div>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {record.metadata?.notes && (
          <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote size={14} className="text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Doctor's Notes</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-400 font-medium leading-relaxed">{record.metadata.notes}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" leftIcon={<Download size={16} />} className="flex-1 h-12 rounded-xl" onClick={() => window.print()}>Download PDF</Button>
          <Button leftIcon={<Sparkles size={16} />} className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-black text-white" onClick={() => { alert('Re-analysis started! Check back soon.') }}>Full Re-Analysis</Button>
        </div>
      </div>
    </Modal>
  )
}

// Timeline Card
function TimelineCard({ record, onClick, index }) {
  const iconBg = ICON_BG[record.type] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  const extracted = record.ai_analysis?.extracted_values || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => onClick(record)}
      className="flex items-start gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden"
    >
      {/* Selection Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/[0.02] pointer-events-none" />
      
      <div className={cn('p-2.5 rounded-xl flex-shrink-0 relative z-10', iconBg)}>
        {RECORD_ICONS[record.type]}
      </div>
      
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1.5">
          <h3 className="font-bold text-[var(--color-text-primary)] text-sm truncate">{record.title}</h3>
          <div className="flex items-center gap-2">
            <RecordTypeBadge type={record.type} />
            {record.ai_analysis && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/30">
                <Sparkles size={8} /> AI
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-text-muted)] font-medium">
          <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(record.date)}</span>
          {record.metadata?.doctor_name && <span className="flex items-center gap-1"><User size={12} /> {record.metadata.doctor_name}</span>}
        </div>

        {/* Quick Numbers Chips */}
        {extracted.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {extracted.slice(0, 3).map((v, i) => (
              <div key={i} className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{v.parameter}</span>
                <span className="text-[10px] font-black text-slate-900 dark:text-white font-data">{v.value}</span>
              </div>
            ))}
            {extracted.length > 3 && (
              <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400">+{extracted.length - 3} more</div>
            )}
          </div>
        )}

        {record.ai_analysis?.summary && !extracted.length && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 line-clamp-1 italic font-medium opacity-80">
            "{record.ai_analysis.summary}"
          </p>
        )}
      </div>
      
      <div className="flex flex-col items-end gap-2 shrink-0">
        <ChevronRight size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </motion.div>
  )
}

function PassportOverview({ profile, healthMetrics, records }) {
  const p = profile?.profile
  const name = profile?.name || 'User'
  const passportId = profile?.passport_id || 'Generating...'
  const cfg = getHealthScoreConfig(healthMetrics?.health_score || 0)

  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (passportId !== 'Generating...') {
      navigator.clipboard.writeText(passportId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Compute live counts from local records state
  const liveReports = records?.filter(r => r.type === 'report').length || 0
  const livePrescriptions = records?.filter(r => r.type === 'prescription').length || 0
  const liveConsultations = records?.filter(r => ['diagnosis', 'treatment', 'followup'].includes(r.type)).length || 0
  const liveVaccinations = records?.filter(r => r.type === 'vaccination').length || 0

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-purple-600 px-6 pt-6 pb-8">
        <div className="flex items-center gap-4">
          <Avatar name={name} src={p?.photo_url} size="xl" className="border-4 border-white/30 shadow-lg" />
          <div className="text-white">
            <h2 className="text-2xl font-bold">{name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {p?.dob && <span className="text-sm opacity-90">{new Date().getFullYear() - new Date(p.dob).getFullYear()} yrs</span>}
              {p?.gender && <span className="text-sm opacity-90">· {p.gender}</span>}
            </div>
            
            <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/30">
              <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Passport ID:</span>
              <span className="text-sm font-mono font-bold text-white tracking-wider">{passportId}</span>
              <button 
                onClick={handleCopy}
                className="ml-2 p-1 hover:bg-white/20 rounded-md transition-colors"
                title="Copy ID"
              >
                {copied ? <Check size={14} className="text-green-300" /> : <Copy size={14} className="text-white/80" />}
              </button>
            </div>
          </div>
          {p?.blood_group && (
            <div className="ml-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/30">
                <p className="text-2xl font-bold text-white">{p.blood_group}</p>
                <p className="text-[10px] text-white/80 font-semibold uppercase tracking-wider">Blood</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[var(--color-border)] bg-[var(--color-surface)] -mt-1">
        {[
          { label: 'Reports',       value: liveReports },
          { label: 'Prescriptions', value: livePrescriptions },
          { label: 'Consultations', value: liveConsultations },
          { label: 'Vaccinations',  value: liveVaccinations },
        ].map((s, i) => (
          <div key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold text-[var(--color-text-primary)] font-data">{s.value}</p>
            <p className="text-xs text-[var(--color-text-muted)] font-medium">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Passport() {
  const records = useRecordsStore(s => s.records)
  const activeFilter = useRecordsStore(s => s.activeFilter)
  const searchQuery = useRecordsStore(s => s.searchQuery)
  const getFilteredRecords = useRecordsStore(s => s.getFilteredRecords)
  const setFilter = useRecordsStore(s => s.setFilter)
  const setSearch = useRecordsStore(s => s.setSearch)
  const profile = useUserStore(s => s.profile)
  const healthMetrics = useUserStore(s => s.healthMetrics)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)

  const filtered = getFilteredRecords()

  const filters = [
    { value: 'all',         label: 'All' },
    { value: 'report',      label: 'Reports' },
    { value: 'prescription',label: 'Prescriptions' },
    { value: 'diagnosis',   label: 'Diagnoses' },
    { value: 'vaccination', label: 'Vaccinations' },
  ]

  return (
    <div className="page-container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Health Passport</h1>
          <p className="text-[var(--color-text-secondary)] mt-0.5">Your complete lifelong medical record</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setUploadOpen(true)}>
          Add Record
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <PassportOverview profile={profile} healthMetrics={healthMetrics} records={records} />
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            placeholder="Search your health records..."
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border',
                activeFilter === f.value
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-slate-400'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            title="No records found"
            description={searchQuery ? 'Try a different search term.' : 'Add your first health record to get started.'}
            action={<Button leftIcon={<Plus size={16} />} onClick={() => setUploadOpen(true)}>Add Record</Button>}
          />
        ) : (
          filtered.map((record, i) => (
            <TimelineCard key={record.id} record={record} index={i} onClick={setSelectedRecord} />
          ))
        )}
      </div>

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <RecordDetail record={selectedRecord} isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  )
}
