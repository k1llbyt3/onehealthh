import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  UploadCloud, FileText, Check, X, TrendingUp, TrendingDown,
  Minus, Sparkles, Download, Save, RotateCcw, ChevronRight
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Alert, ProgressBar } from '../ui/index'
import { useRecordsStore } from '../../store/recordsStore'
import { useToast } from '../ui/Toast'
import { cn } from '../../utils/formatters'
import { aiService } from '../../services/aiService'
import { useUserStore } from '../../store/userStore'

const STEPS = ['Uploading', 'Extracting Text', 'Analyzing Values', 'Generating Summary']

const statusIcons = {
  normal:   { icon: <Minus size={12} />,      color: 'bg-emerald-100 text-emerald-700' },
  high:     { icon: <TrendingUp size={12} />,  color: 'bg-red-100 text-red-700' },
  low:      { icon: <TrendingDown size={12} />, color: 'bg-blue-100 text-blue-700' },
  critical: { icon: <TrendingUp size={12} />,  color: 'bg-red-200 text-red-900' },
}

export default function ReportAnalyzer() {
  const [step, setStep] = useState('upload') // upload | processing | results
  const [files, setFiles] = useState([])
  const [reportType, setReportType] = useState('report')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [result, setResult] = useState(null)
  const profile = useUserStore(s => s.profile)
  const addRecord = useRecordsStore(s => s.addRecord)
  const toast = useToast()

  const onDrop = useCallback((accepted) => setFiles(accepted), [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg'], 'image/png': ['.png'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  })

  const handleAnalyze = async () => {
    if (!files.length) return
    try {
      setStep('processing')
      setProgress(10)
      setCurrentStep(0)

      const formData = new FormData()
      formData.append('file', files[0])
      formData.append('report_type', reportType)
      
      const patient_context = {
        age: profile?.age,
        gender: profile?.gender,
        chronic_diseases: profile?.chronic_diseases || []
      }
      formData.append('patient_context', JSON.stringify(patient_context))

      const stepInterval = setInterval(() => {
        setCurrentStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev))
        setProgress(prev => (prev < 90 ? prev + 20 : prev))
      }, 3000)

      const res = await aiService.analyzeReport(formData)
      
      clearInterval(stepInterval)
      setProgress(100)
      setCurrentStep(STEPS.length - 1)
      setResult(res)
      setStep('results')
    } catch (err) {
      console.error('Analysis failed:', err)
      toast.error('Analysis Failed', 'Could not analyze report. Ensure it is a valid medical document.')
      setStep('upload')
    }
  }

  const handleSave = () => {
    addRecord({
      id: `rec-${Date.now()}`,
      type: 'report',
      date: new Date().toISOString().split('T')[0],
      title: result?.report_type || files[0]?.name || 'Analyzed Report',
      metadata: { doctor_name: 'oneHealth AI', hospital: '', notes: '' },
      ai_analysis: {
        summary: result?.overall_summary,
        extracted_values: result?.extracted_values,
        suggested_actions: result?.suggested_actions,
      },
    })
    toast.success('Saved to Passport', 'The analyzed report has been saved.')
  }

  const handleReset = () => {
    setStep('upload'); setFiles([]); setResult(null); setProgress(0); setCurrentStep(0)
  }

  return (
    <div className="page-container py-6 space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-[var(--color-primary)] mb-4">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-[var(--color-text-primary)]">AI Report Analyzer</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Upload a medical report and get an instant AI-powered plain-language summary.</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'report',        label: 'Blood Test' },
                { id: 'radiology',     label: 'Radiology' },
                { id: 'prescription',  label: 'Prescription' },
                { id: 'other',         label: 'Other' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setReportType(t.id)}
                  className={cn(
                    'p-3 rounded-xl border text-sm font-medium transition-all',
                    reportType === t.id
                      ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div
              {...getRootProps()}
              className={cn(
                'rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all',
                isDragActive ? 'border-[var(--color-primary)] bg-blue-50' :
                files.length ? 'border-emerald-400 bg-emerald-50' :
                'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-2)]'
              )}
            >
              <input {...getInputProps()} />
              {files.length ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <FileText size={32} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-text-primary)]">{files[0].name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{(files[0].size / 1024).toFixed(0)} KB · Ready to analyze</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center">
                    <UploadCloud size={36} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{isDragActive ? 'Drop your file here' : 'Drag & Drop or Click to Upload'}</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">PDF, JPG, PNG · Max 20 MB</p>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleAnalyze}
              className="w-full h-14 text-lg font-bold"
              disabled={files.length === 0}
              leftIcon={<Sparkles size={20} />}
            >
              Analyze Report with AI
            </Button>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 space-y-8">
            <div className="flex justify-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-lg border-4 border-[var(--color-surface-2)]" />
                <div className="absolute inset-0 rounded-lg border-4 border-purple-500 border-t-transparent animate-spin" />
                <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-purple-500 to-[var(--color-primary)] flex items-center justify-center">
                  <Sparkles size={24} className="text-white" />
                </div>
              </div>
            </div>
            <div className="max-w-sm mx-auto space-y-4">
              <ProgressBar value={progress} color="primary" showPercent />
              <div className="space-y-2">
                {STEPS.map((s, i) => (
                  <div key={i} className={cn('flex items-center gap-3 text-sm transition-all', i <= currentStep ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]')}>
                    <div className={cn('w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0', i < currentStep ? 'bg-emerald-500' : i === currentStep ? 'bg-[var(--color-primary)] animate-pulse' : 'bg-[var(--color-surface-2)]')}>
                      {i < currentStep ? <Check size={10} className="text-white" /> : <span className="text-[10px] text-white font-bold">{i + 1}</span>}
                    </div>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-purple-600" />
                <h3 className="font-bold text-lg text-[var(--color-text-primary)]">AI Summary — {result.report_type}</h3>
              </div>
              <p className="text-[var(--color-text-primary)] leading-relaxed">{result.overall_summary}</p>
              {result.abnormal_findings?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.abnormal_findings.map((f, i) => (
                    <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">⚠ {f}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <h3 className="font-bold text-lg text-[var(--color-text-primary)]">Extracted Values</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-surface-2)]">
                    <tr>
                      {['Parameter', 'Your Value', 'Reference Range', 'Status', 'What it means'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {result.extracted_values?.map((v, i) => {
                      const s = statusIcons[v.status] || statusIcons.normal
                      return (
                        <tr key={i} className={cn('hover:bg-[var(--color-surface-2)] transition-colors', v.status !== 'normal' ? 'bg-amber-50/50' : '')}>
                          <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{v.parameter}</td>
                          <td className="px-4 py-3 font-mono font-bold text-[var(--color-text-primary)]">{v.value} {v.unit}</td>
                          <td className="px-4 py-3 text-[var(--color-text-secondary)]">{v.reference_range}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold', s.color)}>
                              {s.icon} {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] max-w-xs">{v.plain_explanation}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-4">Suggested Actions</h3>
              <ol className="space-y-3">
                {result.suggested_actions?.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm text-[var(--color-text-primary)]">
                    <span className="w-6 h-6 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center flex-shrink-0 font-bold text-xs">{i + 1}</span>
                    {a}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1" leftIcon={<Save size={16} />} onClick={handleSave}>Save to Passport</Button>
              <Button variant="outline" className="flex-1" leftIcon={<Download size={16} />} onClick={() => window.print()}>Download PDF Summary</Button>
              <Button variant="outline" leftIcon={<RotateCcw size={16} />} onClick={handleReset}>Analyze Another</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
