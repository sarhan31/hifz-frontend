import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '../pages/SplashScreen';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const BootGate = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(() => {
    try {
      return sessionStorage.getItem('huffaz_booted') === 'true';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const minMsParam = Number(urlParams.get('ms')) || 5000;
  const maxMsParam = Number(urlParams.get('max')) || 15000;
  const pollMs = Number(urlParams.get('poll')) || 700;

  const hasSeenIntro = () => {
    if (!user?.id) return true;
    return localStorage.getItem(`has_seen_intro_${user.id}`) === 'true';
  };

  const runChecks = async () => {
    setError(false);
    const started = Date.now();
    let stopped = false;
    // If already ready (booted), we don't need to enforce minimum wait time
    const effectiveMinMs = ready ? 0 : minMsParam;

    const loop = async () => {
      if (stopped) return;
      try {
        const [health, bootstrap] = await Promise.all([
          axios.get(`${API_URL}/api/health`),
          axios.get(`${API_URL}/api/dashboard/bootstrap`).catch(() => ({ data: { ok: true } }))
        ]);
        const ok = Boolean(health.data?.status) && (bootstrap.data?.ok || bootstrap.status === 200);
        const elapsed = Date.now() - started;
        if (ok) {
          const wait = Math.max(0, effectiveMinMs - elapsed);
          setTimeout(() => {
            if (!hasSeenIntro()) {
              navigate('/intro', { replace: true });
              return;
            }
            sessionStorage.setItem('huffaz_booted', 'true');
            setReady(true);
          }, wait);
          return;
        }
        if (elapsed >= maxMsParam) {
          setError(true);
          return;
        }
        setTimeout(loop, pollMs);
      } catch {
        const elapsed = Date.now() - started;
        if (elapsed >= maxMsParam) {
          setError(true);
          return;
        }
        setTimeout(loop, pollMs);
      }
    };

    loop();
    return () => {
      stopped = true;
    };
  };

  useEffect(() => {
    const cancel = runChecks();
    return () => {
      if (typeof cancel === 'function') cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <AnimatePresence mode="wait">
      {!ready ? (
        <SplashScreen key="splash" noAutoNav status={error ? 'error' : 'checking'} />
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BootGate;
