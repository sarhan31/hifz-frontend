import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const SplashScreen = ({ noAutoNav = false, status: externalStatus, onRetry }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [localStatus, setLocalStatus] = useState('checking'); // 'checking' | 'error'
  
  const status = externalStatus || localStatus;
  
  const previewMode = searchParams.get('preview') === '1';
  const minMs = Math.max(0, Number(searchParams.get('ms')) || 5000);

  const hasSeenIntro = () => {
    if (!user?.id) return true;
    return localStorage.getItem(`has_seen_intro_${user.id}`) === 'true';
  };

  const runChecks = async () => {
    setLocalStatus('checking');
    try {
      const started = Date.now();
      const [health, bootstrap] = await Promise.all([
        axios.get(`${API_URL}/api/health`),
        axios.get(`${API_URL}/api/dashboard/bootstrap`).catch(() => ({ data: { ok: true } }))
      ]);
      if (health.data?.status && (bootstrap.data?.ok || bootstrap.status === 200)) {
        const elapsed = Date.now() - started;
        const wait = Math.max(0, minMs - elapsed);
        if (!noAutoNav) {
          setTimeout(() => {
            if (!hasSeenIntro()) {
              navigate('/intro', { replace: true });
              return;
            }
            navigate('/', { replace: true });
          }, wait);
        } else {
          setTimeout(() => setLocalStatus('checking'), wait);
        }
        return;
      }
      throw new Error('Bootstrap not ready');
    } catch {
      setLocalStatus('error');
    }
  };

  useEffect(() => {
    if (status === 'success' && !noAutoNav) {
      const timer = setTimeout(() => {
        if (!previewMode) {
          navigate('/');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (status === 'booting') {
        runChecks();
    }
  }, [status, navigate, noAutoNav, previewMode, runChecks]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-emerald-50 p-8 overflow-hidden relative"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: -20, filter: 'blur(10px)' }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md flex flex-col items-center z-10"
      >
        {/* Emblem */}
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 mb-10 flex items-center justify-center">
          {/* Glow effect behind */}
          <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
          
          {/* Rotating outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-emerald-500/20 border-t-emerald-400/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Counter-rotating inner ring (subtle) */}
          <motion.div
            className="absolute inset-4 rounded-full border border-emerald-800/30 border-b-emerald-600/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Center Circle */}
          <div className="absolute inset-8 bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center justify-center border border-emerald-800/50">
            <span className="text-4xl sm:text-5xl font-bold text-emerald-100 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)] pb-3" style={{ fontFamily: 'sans-serif' }}>
              حفظ
            </span>
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
          Hifz Companion
        </h1>

        <p className="text-center text-emerald-200/90 font-medium text-sm sm:text-base leading-relaxed max-w-xs mb-8">
          Memorizing is a blessing.<br/>
          Preserving is a responsibility.
        </p>

        {/* Subtext Points */}
        <div className="space-y-3 mb-12 flex flex-col items-center">
          <span className="text-xs sm:text-sm text-emerald-400/60 tracking-wide uppercase font-medium">Strengthen what you carry</span>
          <span className="text-xs sm:text-sm text-emerald-400/60 tracking-wide uppercase font-medium">Protect what you have learned</span>
          <span className="text-xs sm:text-sm text-emerald-400/60 tracking-wide uppercase font-medium">Return every day with discipline</span>
        </div>

        {/* Loading Bar */}
        <div className="w-48 h-[2px] bg-emerald-900/50 rounded-full overflow-hidden mb-3 relative">
          <motion.div
            className={`absolute top-0 left-0 h-full ${status === 'error' ? 'bg-red-500/70' : 'bg-emerald-400/80'}`}
            initial={{ width: "0%", left: "0%" }}
            animate={{ 
              width: status === 'checking' ? ["0%", "100%", "0%"] : "100%",
              left: status === 'checking' ? ["0%", "0%", "100%"] : "0%"
            }}
            transition={{ 
              duration: 2, 
              repeat: status === 'checking' ? Infinity : 0, 
              ease: "easeInOut" 
            }}
          />
        </div>
        
        <p className="text-[10px] sm:text-xs text-emerald-500/60 tracking-wider font-light uppercase">
          {status === 'error' ? 'Connecting to server...' : 'Preparing your Hifz journey...'}
        </p>

        {/* Controls for preview/error */}
        {previewMode && (
          <button
            onClick={() => navigate('/', { replace: true })}
            className="mt-8 px-6 py-2 rounded-full border border-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-900/30 transition-all"
          >
            Enter Dashboard
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={onRetry ? onRetry : runChecks}
            className="mt-6 px-6 py-2 rounded-full bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 text-xs hover:bg-emerald-800/40 transition-all"
          >
            Retry Connection
          </button>
        )}

      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
