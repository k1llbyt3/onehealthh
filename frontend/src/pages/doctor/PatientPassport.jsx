import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  PhoneCall, 
  AlertTriangle, 
  Pill, 
  Activity, 
  FileText,
  Calendar,
  TrendingUp,
  Loader2,
  Search
} from 'lucide-react'
import { Card, Button, Badge } from '../../components/ui'
import { MedicalTimeline } from '../../components/doctor/passport/MedicalTimeline'
import { ReportReviewModule } from '../../components/doctor/passport/ReportReviewModule'
import { HealthTrendsChart } from '../../components/doctor/passport/HealthTrendsChart'
import api from '../../services/api'

export function PatientPassport() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [patientData, setPatientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/patients/passport/${id}`)
        setPatientData(response.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch passport:', err)
        setError('Failed to fetch patient data. Please check the Passport ID or your permissions.')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchPassport()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p>Fetching patient passport...</p>
        </div>
      </div>
    )
  }

  if (error || !patientData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Passport Not Found</h2>
          <p className="text-slate-500 dark:text-slate-400">{error || 'Unable to locate this patient passport.'}</p>
          <Button onClick={() => navigate('/doctor/patients')} className="mt-4">Back to Directory</Button>
        </div>
      </div>
    )
  }

  const { profile, name, emergency_card, timeline } = patientData
  const age = profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : '--'
  const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Nav Action */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="text-slate-500" onClick={() => navigate('/doctor/patients')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(`/doctor/consultation/${id}`)}>
          Start Consultation
        </Button>
      </div>

      {/* Comprehensive Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-0 overflow-hidden border-0 shadow-md bg-white dark:bg-slate-900 rounded-3xl">
          
          <div className="p-8 flex flex-col md:flex-row gap-8 items-start relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>

            {/* Profile Info */}
            <div className="flex gap-6 items-center md:w-1/3 relative z-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-3xl shadow-inner border-4 border-white dark:border-slate-900">
                {profile?.photo_url ? <img src={profile.photo_url} alt={name} className="w-full h-full object-cover rounded-full" /> : initials}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{name}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium font-mono uppercase tracking-widest text-xs mb-1">ID: {id}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-300">
                  <span>{profile?.gender || '--'}, {age}y</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="flex items-center gap-1 font-bold text-red-500"><DropletIcon className="w-3 h-3" /> {profile?.blood_group || '--'}</span>
                </div>
              </div>
            </div>

            <div className="w-px h-24 bg-slate-200 dark:bg-slate-800 hidden md:block relative z-10"></div>

            {/* Emergency & Quick Info */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><PhoneCall className="w-3 h-3" /> Emergency Contact</h4>
                  {emergency_card?.emergency_contacts?.length > 0 ? (
                    emergency_card.emergency_contacts.map((contact, idx) => (
                      <div key={idx} className="mb-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{contact.name} ({contact.relationship})</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{contact.phone}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No emergency contacts listed.</p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Pill className="w-3 h-3" /> Current Meds</h4>
                  <div className="flex flex-wrap gap-2">
                    {emergency_card?.active_medications?.length > 0 ? (
                      emergency_card.active_medications.map((med, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700">
                          {med.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No active medications.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Badges Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 px-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-6">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-red-100 text-red-600 rounded-md mt-0.5"><AlertTriangle className="w-4 h-4" /></div>
              <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Allergies</p>
                <div className="flex gap-2 flex-wrap">
                  {emergency_card?.allergies?.length > 0 ? (
                    emergency_card.allergies.map((a, i) => <Badge key={i} variant="danger">{a}</Badge>)
                  ) : (
                    <span className="text-xs text-slate-500">None reported</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md mt-0.5"><Activity className="w-4 h-4" /></div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Chronic Conditions</p>
                <div className="flex gap-2 flex-wrap">
                  {emergency_card?.chronic_diseases?.length > 0 ? (
                    emergency_card.chronic_diseases.map((d, i) => <Badge key={i} variant="warning">{d}</Badge>)
                  ) : (
                    <span className="text-xs text-slate-500">None reported</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </Card>
      </motion.div>

      {/* Health Trends Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-6 border-0 shadow-sm bg-white dark:bg-slate-900 rounded-3xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Health Trends</h3>
              <p className="text-xs text-slate-400">Extracted from lab reports & AI analysis</p>
            </div>
          </div>
          <HealthTrendsChart timeline={timeline} />
        </Card>
      </motion.div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" /> Medical Timeline
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search patient records..." 
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>
            <Card className="p-6 border-0 shadow-sm bg-white dark:bg-slate-900">
              <MedicalTimeline timeline={timeline} />
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Report Viewer & Quick Actions */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Recent Reports
            </h3>
            <ReportReviewModule timeline={timeline} />
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
             <Card className="p-6 border-0 shadow-sm bg-white dark:bg-slate-900">
               <h4 className="font-bold text-slate-900 dark:text-white mb-4">Quick Stats</h4>
               <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                   <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Records</span>
                   <span className="font-bold text-slate-900 dark:text-white">{timeline?.filter(t => t.type === 'record').length || 0}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                   <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Update</span>
                   <span className="font-bold text-slate-900 dark:text-white">{timeline?.[0]?.date ? new Date(timeline[0].date).toLocaleDateString() : 'N/A'}</span>
                 </div>
               </div>
             </Card>
          </motion.div>
        </div>

      </div>

    </div>
  )
}

function DropletIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.5c-3.5 0-6.5-2.9-6.5-6.4 0-3.9 6.5-12.6 6.5-12.6s6.5 8.7 6.5 12.6c0 3.5-3 6.4-6.5 6.4z"/>
    </svg>
  )
}
