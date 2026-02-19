import { useState, useEffect } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import LoginPage from './LoginPage'
import AppMain from './AppMain'
import Dashboard from './Dashboard'
import { saveAnalysis } from './utils/analysisLogger'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const auth = getAuth(app)

// view: 'loading' | 'login' | 'dashboard' | 'analyze'
export default function App() {
  const [user, setUser]   = useState(null)
  const [view, setView]   = useState('loading')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setView(u ? 'dashboard' : 'login')
    })
    return unsub
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    setUser(null)
    setView('login')
  }

  // Called by AppMain when analysis completes — auto-saves to Firestore
  const handleAnalysisComplete = async (results, vcfFileName) => {
    if (!user || !results?.length) return
    try {
      await saveAnalysis(user.uid, results, vcfFileName)
    } catch (e) {
      console.warn('Failed to save analysis to history:', e)
    }
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <p className="text-gray-500 text-sm font-mono">Initializing…</p>
        </div>
      </div>
    )
  }

  if (view === 'login') {
    return <LoginPage onLogin={(u) => { setUser(u); setView('dashboard') }} />
  }

  if (view === 'dashboard') {
    return (
      <Dashboard
        user={user}
        onNewAnalysis={() => setView('analyze')}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'analyze') {
    return (
      <AppMain
        user={user}
        onLogout={handleLogout}
        onDashboard={() => setView('dashboard')}
        onAnalysisComplete={handleAnalysisComplete}
      />
    )
  }
}