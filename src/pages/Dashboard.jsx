import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Play, CheckCircle, AlertTriangle, Pause, Mic, Brain, Settings, Activity, Calendar, Flame, ChevronDown, ChevronUp, BarChart2, Volume2 } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import EmptyState from '../components/EmptyState';

const API_URL = import.meta.env.VITE_API_URL;

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { user, session } = useAuth();
  const [plan, setPlan] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [strengthData, setStrengthData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [memoryRisks, setMemoryRisks] = useState([]);
   const [streak, setStreak] = useState(0);
   const [activity, setActivity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingUrl, setPlayingUrl] = useState(null);
  const [surahList, setSurahList] = useState([]);
  const [confidenceData, setConfidenceData] = useState([]);
  const [declineAlerts, setDeclineAlerts] = useState([]);
  const audioRef = useRef(null);
  const navigate = useNavigate();
  const [autoMode, setAutoMode] = useState(true);
  const [manualPlan, setManualPlan] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [planMessage, setPlanMessage] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Hafiz';

  const handlePlayAudio = (url) => {
    const fullUrl = `${API_URL}${url}`;
    
    if (playingUrl === fullUrl) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(fullUrl);
      audioRef.current.onended = () => setPlayingUrl(null);
      audioRef.current.play().catch(e => console.error("Audio playback error:", e));
      setPlayingUrl(fullUrl);
    }
  };

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const cacheKey = `dashboard_data_${userId}`;

    const fetchData = async () => {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setPlan(data.plan);
          setRecentLogs(data.recentLogs || []);
          setStrengthData(data.strengthData || []);
          setAlerts(data.alerts || []);
          setMemoryRisks(data.memoryRisks || []);
          setStreak(data.streak || 0);
          setActivity(data.activity || 0);
          setSurahList(data.surahList || []);
          setConfidenceData(data.confidenceData || []);
          setDeclineAlerts(data.declineAlerts || []);
          setLoading(false);
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      try {
        const headers = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const fetchPlan = async () => {
          try {
            return await axios.get(`${API_URL}/api/revision-plan/today/${userId}`, { headers });
          } catch (err) {
            if (err.response && err.response.status === 404) {
              return await axios.post(`${API_URL}/api/revision-plan/generate`, { user_id: userId }, { headers });
            }
            throw err;
          }
        };

        const [
          planRes,
          logsRes,
          sessionsRes,
          strengthRes,
          alertsRes,
          riskRes,
          streakRes,
          surahsRes,
          confidenceRes,
          declineRes
        ] = await Promise.all([
          fetchPlan(),
          axios.get(`${API_URL}/api/recitation-log/${userId}`, { headers }),
          axios.get(`${API_URL}/api/recitation-sessions/today/${userId}`, { headers }),
          axios.get(`${API_URL}/api/surah-strength/${userId}`, { headers }),
          axios.get(`${API_URL}/api/alerts/${userId}`, { headers }),
          axios.get(`${API_URL}/api/memory-risk/${userId}`, { headers }),
          axios.get(`${API_URL}/api/streak/${userId}`, { headers }),
          axios.get(`${API_URL}/api/quran/surahs`),
          axios.get(`${API_URL}/api/surah-confidence/${userId}`, { headers }),
          axios.get(`${API_URL}/api/decline-alerts/${userId}`, { headers })
        ]);

        const newData = {
          plan: planRes.data,
          recentLogs: [
            ...(logsRes.data || []).map(l => ({ ...l, type: 'log' })),
            ...(sessionsRes.data?.sessions_completed > 0 ? [{ 
              id: 'today-session-summary',
              surah_number: 1,
              accuracy: sessionsRes.data.avg_accuracy,
              created_at: new Date().toISOString(),
              type: 'session-summary',
              count: sessionsRes.data.sessions_completed
            }] : [])
          ],
          strengthData: strengthRes.data,
          alerts: alertsRes.data,
          memoryRisks: riskRes.data,
          streak: streakRes.data.currentStreak,
          activity: streakRes.data.weeklyConsistency,
          surahList: surahsRes.data,
          confidenceData: confidenceRes.data,
          declineAlerts: declineRes.data
        };

        setPlan(newData.plan);
        setRecentLogs(newData.recentLogs);
        setStrengthData(newData.strengthData);
        setAlerts(newData.alerts);
        setMemoryRisks(newData.memoryRisks);
        setStreak(newData.streak);
        setActivity(newData.activity);
        setSurahList(newData.surahList);
        setConfidenceData(newData.confidenceData);
        setDeclineAlerts(newData.declineAlerts);

        sessionStorage.setItem(cacheKey, JSON.stringify(newData));

      } catch (err) {
        console.error("Error fetching data:", err);
        if (!sessionStorage.getItem(cacheKey)) {
            setError("Unable to sync with cloud. Showing offline data if available.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, session?.access_token]);

  const updateCachedPlan = (updatedPlan) => {
    const userId = user?.id;
    if (!userId) return;
    const cacheKey = `dashboard_data_${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached);
      parsed.plan = updatedPlan;
      sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
    } catch {}
  };

  const saveCustomPlanToBackend = async (planToSave) => {
    const userId = user?.id;
    if (!userId) return;
    const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
    try {
      await axios.post(`${API_URL}/api/revision-plan/custom`, {
        user_id: userId,
        sabaq: planToSave.sabaq,
        sabaqi: planToSave.sabaqi,
        manzil: planToSave.manzil
      }, { headers });
    } catch (err) {
      console.error("Error saving custom plan:", err);
    }
  };

  const countPlanSurahs = (p) => {
    if (!p) return 0;
    return (p.sabaq ? 1 : 0) + (p.sabaqi ? p.sabaqi.length : 0) + (p.manzil ? p.manzil.length : 0);
  };

  const applyManualUpdate = (updated) => {
    setManualPlan(updated);
    updateCachedPlan(updated);
    saveCustomPlanToBackend(updated);
  };

  const handleToggleAutoMode = async () => {
    if (!plan) return;
    if (autoMode) {
      setAutoMode(false);
      setManualPlan(plan);
      setPlanMessage('');
    } else {
      const userId = user?.id;
      if (!userId) return;
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      try {
        const res = await axios.post(`${API_URL}/api/revision-plan/generate`, { user_id: userId }, { headers });
        setPlan(res.data);
        updateCachedPlan(res.data);
        setAutoMode(true);
        setManualPlan(null);
        setPlanMessage('Auto plan restored.');
        setTimeout(() => setPlanMessage(''), 3000);
      } catch (err) {
        console.error("Error regenerating auto plan:", err);
      }
    }
  };

  const isHighRiskSurah = (surahId) => memoryRisks.some(r => Number(r.surah) === Number(surahId) && r.risk === 'high');

  const removeSurahFromPlan = (bucket, surahId) => {
    const base = manualPlan || plan;
    if (!base) return;
    let updated = { ...base };
    if (bucket === 'sabaq') {
      if (updated.sabaq && updated.sabaq.surah === surahId) updated = { ...updated, sabaq: null };
    } else if (bucket === 'sabaqi') {
      updated = { ...updated, sabaqi: (updated.sabaqi || []).filter(s => s.surah !== surahId) };
    } else if (bucket === 'manzil') {
      updated = { ...updated, manzil: (updated.manzil || []).filter(s => s.surah !== surahId) };
    }
    applyManualUpdate(updated);
  };

  const requestRemoveSurah = (bucket, surahId) => {
    if (autoMode) return;
    if (isHighRiskSurah(surahId)) {
      setPendingRemoval({ bucket, surahId });
    } else {
      removeSurahFromPlan(bucket, surahId);
    }
  };

  const getLocale = (lang) => {
    switch(lang) {
      case 'hi': return 'hi-IN';
      case 'gu': return 'gu-IN';
      case 'ur': return 'ur-PK';
      default: return 'en-US';
    }
  };

  const getSurahName = (surahNumber) => {
    const num = Number(surahNumber);
    const match = surahList.find(s => s.id === num);
    if (!match) return `Surah ${surahNumber}`;
    return match.name && match.transliteration ? `${num}. ${match.name} (${match.transliteration})` : `Surah ${num}`;
  };

  const getSurahLabelForLog = (surahNumber) => {
    const num = Number(surahNumber);
    const match = surahList.find(s => s.id === num);
    return match ? { primary: `${num}. ${match.name}`, secondary: match.transliteration } : { primary: `Surah ${surahNumber}`, secondary: null };
  };

  const getConfidenceBadge = (score) => {
    if (score == null || Number.isNaN(Number(score))) return null;
    const value = Number(score);
    if (value >= 90) return { icon: '🔥', label: 'Excellent', colorClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' };
    if (value >= 75) return { icon: '🟢', label: 'Good', colorClass: 'bg-green-500/20 text-green-300 border border-green-500/30' };
    if (value >= 60) return { icon: '🟡', label: 'Needs Practice', colorClass: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' };
    return { icon: '🔴', label: 'Weak', colorClass: 'bg-red-500/20 text-red-300 border border-red-500/30' };
  };

  const todayDate = new Date().toLocaleDateString(getLocale(language), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const activePlan = autoMode ? plan : manualPlan || plan;

  const hasPlan = (activePlan?.sabaq || activePlan?.sabaqi?.length > 0 || activePlan?.manzil?.length > 0);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30">
      <div className="max-w-md mx-auto px-4 pt-8 pb-32">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tight leading-none">{t('salam')}, {displayName}</h1>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mt-2 opacity-70">{t('hafizAICompanion')}</p>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="p-3 transition-all active:scale-90"
          >
            <Settings className="w-6 h-6" />
          </button>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Primary Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              whileTap={{ scale: 0.98 }}
              className="glass-card p-6 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-orange-500/20 rounded-xl border border-orange-500/30">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('streak')}</span>
              </div>
              <div className="flex items-baseline gap-1 relative z-10">
                <span className="text-5xl font-black tracking-tighter">{streak}</span>
                <span className="text-xs font-bold opacity-60 uppercase">{t('days')}</span>
              </div>
            </motion.div>

            <motion.div 
              whileTap={{ scale: 0.98 }}
              className="glass-card p-6 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('activity')}</span>
              </div>
              <div className="flex items-baseline gap-1 relative z-10">
                <span className="text-5xl font-black tracking-tighter">{activity}</span>
                <span className="text-xs font-bold opacity-60 uppercase">%</span>
              </div>
            </motion.div>
          </div>

          {/* Quick Tools */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/audio-player')}
              className="glass-card p-5 relative overflow-hidden group cursor-pointer border-l-4 border-l-blue-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <Volume2 className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Immersive</span>
              </div>
              <h3 className="text-sm font-bold text-white relative z-10">Audio Player</h3>
              <p className="text-[10px] text-slate-500 mt-1 relative z-10 font-medium">Listening & Focus</p>
            </motion.div>

            <motion.div 
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/makhraj')}
              className="glass-card p-5 relative overflow-hidden group cursor-pointer border-l-4 border-l-emerald-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <Mic className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Practice</span>
              </div>
              <h3 className="text-sm font-bold text-white relative z-10">Makhraj</h3>
              <p className="text-[10px] text-slate-500 mt-1 relative z-10 font-medium">Tajweed Master</p>
            </motion.div>
          </div>

          {/* Revision Plan */}

          <motion.div className="glass-card p-6 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                  <BookOpen className="text-indigo-400 w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">{t('todayRevision')}</h2>
                  <div className="flex items-center gap-2 mt-1">
                     <span className={`w-1.5 h-1.5 rounded-full ${autoMode ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                     <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-black">{autoMode ? t('aiOptimized') : t('manualMode')}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleAutoMode}
                className="text-[9px] font-black px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all uppercase tracking-widest"
              >
                {autoMode ? t('manual') : t('auto')}
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              {/* Sabaq */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 border-l-4 border-l-emerald-500 group active:bg-emerald-500/10 transition-all">
                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-[0.2em] block mb-2">{t('newLessonSabaq')}</span>
                {activePlan?.sabaq ? (
                   <div className="flex justify-between items-center">
                     <span className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">{getSurahName(activePlan.sabaq.surah)}</span>
                     {!autoMode && <button onClick={() => requestRemoveSurah('sabaq', activePlan.sabaq.surah)} className="text-slate-500 hover:text-red-400 text-xl font-light">×</button>}
                   </div>
                ) : <span className="text-slate-500 text-xs italic font-medium opacity-60">{t('noNewLesson')}</span>}
              </div>

              {/* Sabaqi */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 border-l-4 border-l-amber-500 group active:bg-amber-500/10 transition-all">
                <span className="text-[9px] text-amber-400 font-black uppercase tracking-[0.2em] block mb-2">Recent (Sabaqi)</span>
                {activePlan?.sabaqi?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activePlan.sabaqi.map(item => (
                      <div key={item.surah} className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-xs font-bold text-white">{getSurahName(item.surah)}</span>
                        {!autoMode && <button onClick={() => requestRemoveSurah('sabaqi', item.surah)} className="text-slate-500 hover:text-red-400 text-xs">×</button>}
                      </div>
                    ))}
                  </div>
                ) : <span className="text-slate-500 text-xs italic font-medium opacity-60">{t('noRecentLessons')}</span>}
              </div>

              {/* Manzil */}
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 border-l-4 border-l-indigo-500 group active:bg-indigo-500/10 transition-all">
                <span className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] block mb-2">{t('reviewManzil')}</span>
                {activePlan?.manzil?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activePlan.manzil.map(item => (
                      <div key={item.surah} className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-xs font-bold text-white">{getSurahName(item.surah)}</span>
                        {!autoMode && <button onClick={() => requestRemoveSurah('manzil', item.surah)} className="text-slate-500 hover:text-red-400 text-xs">×</button>}
                      </div>
                    ))}
                  </div>
                ) : <span className="text-slate-500 text-xs italic font-medium opacity-60">{t('noReviewAssigned')}</span>}
              </div>
            </div>
          </motion.div>

          {/* Strength Overview */}
          <motion.div className="glass-card p-6 border border-white/10 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -ml-10 -mb-10" />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <Brain className="text-emerald-400 w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">{t('revisionStrength')}</h2>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{t('basedOnPerformance')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/weekly-reflection')}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 active:scale-95"
                >
                  <BarChart2 className="w-5 h-5 text-indigo-400" />
                </button>
                <button 
                  onClick={() => navigate('/hifz-health')}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 active:scale-95"
                >
                  <Activity className="w-5 h-5 text-emerald-400" />
                </button>
              </div>
            </div>

            {strengthData.length > 0 ? (
              <div className="space-y-3 relative z-10">
                {strengthData.slice(0, 3).map((item) => {
                  const surahNumber = item.surah_id || item.surah;
                  const avgAccuracy = item.average_accuracy ?? item.avg_score;
                  const confidenceEntry = confidenceData.find(c => c.surah_id === Number(surahNumber));
                  const badge = confidenceEntry ? getConfidenceBadge(confidenceEntry.confidence) : null;

                  return (
                    <motion.div 
                      key={surahNumber}
                      onClick={() => navigate('/mushaf', { state: { surah: surahNumber } })}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 active:bg-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{getSurahName(surahNumber)}</span>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 opacity-70">{t('accuracyLabel')}: {avgAccuracy}%</span>
                      </div>
                      {badge && (
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${badge.colorClass}`}>
                          {badge.icon} {badge.label}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center opacity-40">
                <Brain className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-20" />
                <p className="text-slate-500 text-xs italic font-medium">{t('startRecitingStrength')}</p>
              </div>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div className="glass-card p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <Activity className="text-emerald-400 w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">{t('recentActivity')}</h2>
              </div>
              <button 
                onClick={() => navigate('/history')}
                className="text-[9px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-[0.2em] px-4 py-2 bg-emerald-500/10 rounded-xl transition-all border border-emerald-500/20 active:scale-95"
              >
                {t('viewLog')}
              </button>
            </div>

            {recentLogs.length > 0 ? (
              <div className="space-y-2">
                {recentLogs.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3).map((log) => {
                  const label = log.type === 'session-summary' 
                    ? { primary: `${t('hifzTests')} (${log.count})`, secondary: t('recentPerformance') }
                    : getSurahLabelForLog(log.surah_number);
                  const isPlaying = playingUrl === `${API_URL}${log.audio_url}`;
                  return (
                    <motion.div 
                      key={log.id} 
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-all group active:bg-white/10"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{label.primary}</span>
                          {log.type === 'session-summary' && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-500/30">
                              {t('today')}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">
                          {log.type === 'session-summary' ? `Avg Accuracy: ${log.accuracy}%` : new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {log.audio_url ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePlayAudio(log.audio_url); }}
                          className={`p-3.5 rounded-2xl transition-all border ${isPlaying ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-500 border-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'}`}
                        >
                          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${log.accuracy >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {log.accuracy >= 90 ? t('excellentBadge') : t('goodBadge')}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center opacity-40">
                <Activity className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-20" />
                <p className="text-slate-500 text-xs italic font-medium">{t('recitationJourney')}</p>
              </div>
            )}
          </motion.div>

          {/* Sticky CTA */}
          <div className="fixed bottom-24 left-0 right-0 p-4 z-40 pointer-events-none">
            <div className="max-w-md mx-auto pointer-events-auto">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/mushaf', { state: hasPlan ? { fromPlan: true, plan: activePlan } : undefined })}
                className="w-full bg-emerald-600 text-white font-black text-xs tracking-[0.3em] py-5 rounded-[28px] shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 border border-emerald-400/30 uppercase"
              >
                <Mic className="w-5 h-5" />
                {hasPlan ? t('beginRevision') : t('startRecitation')}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
