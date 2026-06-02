import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'

export const useUserStore = create(
  persist(
    (set, get) => ({
      profile: null,
      healthMetrics: null,
      isProfileLoading: false,

      setProfile: (profile) => set({ profile }),
      setHealthMetrics: (metrics) => set({ healthMetrics: metrics }),
      updateProfile: (partial) => set((s) => ({
        profile: s.profile ? { ...s.profile, ...partial } : partial
      })),
      setProfileLoading: (v) => set({ isProfileLoading: v }),

      // Fetch live profile from Firestore
      fetchProfile: async (uid) => {
        if (!uid) return
        set({ isProfileLoading: true })
        try {
          const docRef = doc(db, 'users', uid)
          const snap = await getDoc(docRef)
          if (snap.exists()) {
            set({ profile: { uid, ...snap.data() } })
          }
        } catch (err) {
          console.error('[userStore] fetchProfile error:', err)
        } finally {
          set({ isProfileLoading: false })
        }
      },

      // Derive health metrics from Firestore records
      fetchHealthMetrics: async (uid) => {
        if (!uid) return
        try {
          const q = query(collection(db, 'records'), where('patient_uid', '==', uid))
          const snap = await getDocs(q)
          const records = snap.docs.map(d => d.data())

          const counts = records.reduce((acc, r) => {
            if (r.type === 'report')        acc.reports_count++
            if (r.type === 'prescription')  acc.prescriptions_count++
            if (r.type === 'diagnosis')     acc.consultations_count++
            if (r.type === 'vaccination')   acc.vaccinations_count++
            return acc
          }, { reports_count: 0, prescriptions_count: 0, consultations_count: 0, vaccinations_count: 0 })

          // Simple health score: 50 base + up to 50 from record completeness
          const score = Math.min(100, 50 + records.length * 3)
          set({ healthMetrics: { ...counts, health_score: score } })
        } catch (err) {
          console.error('[userStore] fetchHealthMetrics error:', err)
        }
      },

      // Save/update profile to Firestore
      saveProfile: async (uid, data) => {
        try {
          await setDoc(doc(db, 'users', uid), data, { merge: true })
          set((s) => ({ profile: s.profile ? { ...s.profile, ...data } : data }))
        } catch (err) {
          console.error('[userStore] saveProfile error:', err)
        }
      },

      clearProfile: () => set({ profile: null, healthMetrics: null }),
    }),
    { name: 'onehealth-user', partialize: (s) => ({ profile: s.profile }) }
  )
)
