import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider, useTheme, themes } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import RecitationHistory from './pages/RecitationHistory';
import MushafView from './pages/MushafView';
import TeacherDashboard from './pages/TeacherDashboard';
import HifzTestMode from './pages/HifzTestMode';
import Settings from './pages/Settings';
import MakhrajPractice from './pages/MakhrajPractice';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BottomNav from './components/BottomNav';
import PageTransition from './components/PageTransition';
import HuffazDashboard from './pages/HuffazDashboard';
import WeeklyReflection from './pages/WeeklyReflection';
import ProtectedRoute from './components/ProtectedRoute';
import SplashScreen from './pages/SplashScreen';
import Intro from './pages/Intro';
import BootGate from './components/BootGate';
import ScrollToTop from './components/ScrollToTop';
import AudioPlayerPage from './pages/AudioPlayerPage';


const API_URL = import.meta.env.VITE_API_URL;
const BOOT_HEALTH_TIMEOUT_MS = Number(import.meta.env.VITE_BOOT_HEALTH_TIMEOUT_MS) || 10000;
const BOOT_BOOTSTRAP_TIMEOUT_MS = Number(import.meta.env.VITE_BOOT_BOOTSTRAP_TIMEOUT_MS) || 12000;
const BOOT_RETRY_INTERVAL_MS = Number(import.meta.env.VITE_BOOT_RETRY_INTERVAL_MS) || 10000;

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><Dashboard /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/makhraj" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><MakhrajPractice /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/mushaf" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><MushafView /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><RecitationHistory /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/teacher" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><TeacherDashboard /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/hifz-test" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><HifzTestMode /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/hifz-health" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><HuffazDashboard /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/weekly-reflection" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><WeeklyReflection /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><Settings /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />
        <Route path="/audio-player" element={
          <ProtectedRoute>
            <BootGate>
              <PageTransition><AudioPlayerPage /></PageTransition>
            </BootGate>
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

import { useUI } from './context/UIContext';

const MainLayout = () => {
  const location = useLocation();
  const { isBottomNavVisible } = useUI();
  const hideNav = ['/login', '/signup', '/splash', '/intro', '/mushaf', '/audio-player'].includes(location.pathname);


  return (
    <>
      <AnimatedRoutes />
      {!hideNav && isBottomNavVisible && <BottomNav />}
    </>
  );
};

const ThemedApp = () => {
  const { theme } = useTheme();
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(false);
  const retryRef = useRef(null);

  const runBootChecks = async () => {
    try {
      setBootError(false);
      const [health, bootstrap] = await Promise.all([
        axios.get(`${API_URL}/api/health`, { timeout: BOOT_HEALTH_TIMEOUT_MS }),
        axios.get(`${API_URL}/api/bootstrap`, { timeout: BOOT_BOOTSTRAP_TIMEOUT_MS })
      ]);
      if (health.status === 200 && bootstrap.status === 200 && bootstrap.data?.status === 'ready') {
        setBooting(false);
        if (retryRef.current) {
          clearInterval(retryRef.current);
          retryRef.current = null;
        }
        return;
      }
      throw new Error('Boot checks failed');
    } catch (err) {
      setBootError(true);
      setBooting(true);
    }
  };

  useEffect(() => {
    runBootChecks();
    // Optional periodic retry while booting
    retryRef.current = setInterval(() => {
      runBootChecks();
    }, BOOT_RETRY_INTERVAL_MS);
    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, []);
  
  return (
    <div className={`min-h-screen transition-all duration-500 ${themes[theme]} theme-${theme}`}>
      <Router>
        <ScrollToTop />
        {booting ? (
          <SplashScreen noAutoNav={true} status={bootError ? 'error' : 'checking'} onRetry={runBootChecks} />
        ) : (
          <MainLayout />
        )}
      </Router>
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
