import { create } from 'zustand'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore'
import { db } from '../services/firebase'

export const useRecordsStore = create((set, get) => ({
  records: [],
  trends: {},
  activeFilter: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,

  setFilter: (filter) => set({ activeFilter: filter }),
  setSearch: (q) => set({ searchQuery: q }),
  setLoading: (v) => set({ isLoading: v }),

  // Fetch records from Firestore
  fetchRecords: async (uid) => {
    if (!uid) return
    set({ isLoading: true, error: null })
    try {
      const q = query(
        collection(db, 'records'),
        where('patient_uid', '==', uid)
      )
      const snap = await getDocs(q)
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      set({ records, isLoading: false })

      // Build trend data from records with extracted values
      const trends = {}
      records.forEach(r => {
        if (!r.ai_analysis?.extracted_values) return
        r.ai_analysis.extracted_values.forEach(v => {
          const param = v.parameter?.toLowerCase()
          const date = r.date?.substring(0, 7) // YYYY-MM

          if (param?.includes('haemoglobin') || param?.includes('hemoglobin')) {
            if (!trends.haemoglobin) trends.haemoglobin = []
            trends.haemoglobin.push({ date, value: parseFloat(v.value) || 0 })
          }
          if (param?.includes('weight')) {
            if (!trends.weight) trends.weight = []
            trends.weight.push({ date, value: parseFloat(v.value) || 0 })
          }
          if (param?.includes('fasting') || param?.includes('glucose')) {
            if (!trends.bloodSugar) trends.bloodSugar = []
            trends.bloodSugar.push({ date, fasting: parseFloat(v.value) || 0 })
          }
          if (param?.includes('total cholesterol')) {
            if (!trends.cholesterol) trends.cholesterol = []
            trends.cholesterol.push({ date, total: parseFloat(v.value) || 0 })
          }
        })
      })
      set({ trends })
    } catch (err) {
      console.error('[recordsStore] fetchRecords error:', err)
      set({ error: err.message, isLoading: false })
    }
  },

  addRecord: (record) => set((s) => ({ records: [record, ...s.records] })),
  removeRecord: async (id) => {
    try {
      await deleteDoc(doc(db, 'records', id))
      set((s) => ({ records: s.records.filter(r => r.id !== id) }))
    } catch (err) {
      console.error('[recordsStore] removeRecord error:', err)
    }
  },

  saveRecord: async (uid, recordData) => {
    const id = recordData.id || `rec-${Date.now()}`
    const payload = { ...recordData, patient_uid: uid, updatedAt: new Date().toISOString() }
    await setDoc(doc(db, 'records', id), payload, { merge: true })
    get().addRecord({ id, ...payload })
    return id
  },

  getFilteredRecords: () => {
    const { records, activeFilter, searchQuery } = get()
    return records.filter(r => {
      if (activeFilter !== 'all' && r.type !== activeFilter) return false
      if (searchQuery && !r.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  },

  clearRecords: () => set({ records: [], trends: {} }),
}))
