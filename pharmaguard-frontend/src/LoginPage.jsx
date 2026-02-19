import { useState } from 'react'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth'

// ── Firebase config — replace with your own from Firebase Console ─────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app  = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

// ── DNA helix animation dots ──────────────────────────────────────────────────
function DNABackground() {
  const dots = Array.from({ length: 24 }, (_, i) => i)
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map(i => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full opacity-20"
          style={{
            background: i % 3 === 0 ? '#06b6d4' : i % 3 === 1 ? '#0891b2' : '#164e63',
            left: `${(Math.sin(i * 0.8) * 0.5 + 0.5) * 100}%`,
            top:  `${(i / 24) * 100}%`,
            animation: `float ${3 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── Main Login Component ──────────────────────────────────────────────────────
export default function LoginPage({ onLogin }) {
  const [mode, setMode]         = useState('login')   // 'login' | 'register' | 'reset'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showPwd, setShowPwd]   = useState(false)

  const clearMessages = () => { setError(''); setSuccess('') }

  const friendlyError = (code) => {
    const map = {
      'auth/user-not-found':        'No account found with this email.',
      'auth/wrong-password':        'Incorrect password.',
      'auth/email-already-in-use':  'An account with this email already exists.',
      'auth/weak-password':         'Password must be at least 6 characters.',
      'auth/invalid-email':         'Please enter a valid email address.',
      'auth/too-many-requests':     'Too many attempts. Please try again later.',
      'auth/popup-closed-by-user':  'Google sign-in was cancelled.',
      'auth/invalid-credential':    'Invalid email or password.',
    }
    return map[code] || 'Something went wrong. Please try again.'
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    clearMessages()

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        onLogin?.(cred.user)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        onLogin?.(cred.user)
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    clearMessages()
    setLoading(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      onLogin?.(cred.user)
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    clearMessages()
    if (!email) { setError('Enter your email address first.'); return }
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess('Reset link sent! Check your inbox.')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Animated background */}
      <DNABackground />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-20px) scale(1.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      {/* Card */}
      <div className="relative w-full max-w-md fade-in">

        {/* Cyan top border */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded-t-2xl" />

        <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 border-t-0 rounded-b-2xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono tracking-widest text-cyan-500 uppercase">PharmaGuard</span>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {mode === 'login'    && 'Welcome back'}
              {mode === 'register' && 'Create account'}
              {mode === 'reset'    && 'Reset password'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login'    && 'Sign in to access your pharmacogenomic dashboard'}
              {mode === 'register' && 'Join PharmaGuard · RIFT 2026'}
              {mode === 'reset'    && "We'll send a reset link to your email"}
            </p>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-sm flex items-start gap-2">
              <span className="mt-0.5">⚠</span> {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-950/60 border border-green-800 rounded-lg text-green-300 text-sm flex items-start gap-2">
              <span className="mt-0.5">✓</span> {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'reset' ? handleReset : handleEmailAuth} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 tracking-wide uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2.5
                           text-white placeholder-gray-600 text-sm
                           focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30
                           transition-all"
              />
            </div>

            {/* Password */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2.5 pr-10
                               text-white placeholder-gray-600 text-sm
                               focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30
                               transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                  >
                    {showPwd ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 tracking-wide uppercase">
                  Confirm Password
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2.5
                             text-white placeholder-gray-600 text-sm
                             focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30
                             transition-all"
                />
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('reset'); clearMessages() }}
                  className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed
                         text-black font-bold py-2.5 rounded-lg transition-all text-sm tracking-wide
                         shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span>
                  {mode === 'login' ? 'Signing in…' : mode === 'register' ? 'Creating account…' : 'Sending…'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'
              )}
            </button>
          </form>

          {/* Divider */}
          {mode !== 'reset' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-gray-600 text-xs">or continue with</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              {/* Google Sign In */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5
                           bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700 hover:border-gray-500
                           rounded-lg text-white text-sm font-medium transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {/* Mode switcher */}
          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === 'login' && (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('register'); clearMessages() }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Sign up
                </button>
              </>
            )}
            {mode === 'register' && (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); clearMessages() }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Sign in
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('login'); clearMessages() }}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                ← Back to sign in
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}