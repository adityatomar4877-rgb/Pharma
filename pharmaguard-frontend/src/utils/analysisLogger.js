/**
 * PharmaGuard · Analysis Logger
 * Saves and retrieves analysis results to/from Firebase Firestore
 */

import { initializeApp, getApps } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const db  = getFirestore(app)

// ── Multi-gene drug map ───────────────────────────────────────────────────────
// Each drug can involve multiple genes — all are tracked in the report
export const DRUG_GENE_MAP = {
  WARFARIN:      ['CYP2C9', 'VKORC1', 'CYP4F2'],
  CODEINE:       ['CYP2D6'],
  CLOPIDOGREL:   ['CYP2C19', 'ABCB1'],
  SIMVASTATIN:   ['SLCO1B1', 'CYP3A4'],
  AZATHIOPRINE:  ['TPMT', 'NUDT15'],
  FLUOROURACIL:  ['DPYD', 'TYMS'],
}

/**
 * Deep-clean an object to remove undefined values before saving to Firestore.
 * Firestore rejects documents with undefined fields.
 */
function cleanForFirestore(obj) {
  if (Array.isArray(obj)) return obj.map(cleanForFirestore)
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanForFirestore(v)])
    )
  }
  return obj
}

/**
 * Save analysis results for the current user.
 */
export async function saveAnalysis(userId, results, vcfFileName) {
  const ref = collection(db, 'analyses', userId, 'reports')

  // Build a clean summary from results
  const drugsSummary = results.map(r => r.drug).join(', ')
  const riskSummary  = results.map(r => r.risk_assessment?.risk_label || 'Unknown').join(', ')
  const drugCount    = results.length

  // Extract all genes across all results
  const genesInvolved = [...new Set(
    results.map(r => r.pharmacogenomic_profile?.primary_gene).filter(Boolean)
  )]

  // Compute average confidence
  const avgConfidence = results.reduce(
    (s, r) => s + (r.risk_assessment?.confidence_score || 0), 0
  ) / results.length

  const payload = cleanForFirestore({
    results,
    vcfFileName:    vcfFileName || 'unknown.vcf',
    savedAt:        Timestamp.now(),
    drugsSummary,
    riskSummary,
    drugCount,
    genesInvolved,
    avgConfidence,
  })

  const docRef = await addDoc(ref, payload)
  return docRef.id
}

/**
 * Load all saved analyses for the current user, newest first.
 */
export async function loadAnalyses(userId) {
  const ref  = collection(db, 'analyses', userId, 'reports')
  const q    = query(ref, orderBy('savedAt', 'desc'))
  const snap = await getDocs(q)

  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      // Convert Firestore Timestamp → JS Date
      savedAt: data.savedAt?.toDate?.() || new Date(),
    }
  })
}

/**
 * Delete a saved analysis by document ID.
 */
export async function deleteAnalysis(userId, docId) {
  await deleteDoc(doc(db, 'analyses', userId, 'reports', docId))
}
