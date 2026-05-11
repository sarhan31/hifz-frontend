import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, TrendingDown, Star, Award, BookOpen, AlertTriangle, ArrowLeft, Activity, ArrowUpRight, ArrowDownRight, Play } from 'lucide-react';
import SpecialLoader from '../components/SpecialLoader';

const API_URL = import.meta.env.VITE_API_URL;

const WeeklyReflection = () => {
  const { user, session } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [confidenceData, setConfidenceData] = useState([]);
  const [surahList, setSurahList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const headers = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const userId = user.id;

        const [weeklyRes, confidenceRes, surahsRes] = await Promise.all([
          axios.get(`${API_URL}/api/recitation-session/weekly/${userId}`, { headers }),
          axios.get(`${API_URL}/api/surah-confidence/${userId}`, { headers }),
          axios.get(`${API_URL}/api/quran/surahs`)
        ]);

        setSummary(weeklyRes.data);
        setConfidenceData(confidenceRes.data || []);
        setSurahList(surahsRes.data || []);
      } catch (err) {
        console.error("Error loading weekly reflection:", err);
        setError("Failed to load weekly reflection. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, session]);

  const getLocale = (lang) => {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'gu': return 'gu-IN';
      case 'ur': return 'ur-PK';
      default: return 'en-US';
    }
  };

  const getSurahName = (surahNumber) => {
    const num = Number(surahNumber);
    const match = surahList.find(s => s.id === num);
    if (!match) {
      return `Surah ${surahNumber}`;
    }
    const arabicName = match.name;
    const transliteration = match.transliteration;

    if (arabicName && transliteration) {
      return `${num}. ${arabicName} (${transliteration})`;
    }

    if (arabicName) {
      return `${num}. ${arabicName}`;
    }

    if (transliteration) {
      return `${num}. ${transliteration}`;
    }

    return `Surah ${num}`;
  };

  const today = new Date().toLocaleDateString(getLocale(language), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentHealth = summary?.currentHealth ?? null;
  const lastWeekHealth = summary?.lastWeekHealth ?? null;

  let delta = null;
  if (currentHealth !== null && lastWeekHealth !== null) {
    delta = currentHealth - lastWeekHealth;
  }

  const sessions = Array.isArray(summary?.sessionsLast7Days) ? summary.sessionsLast7Days : [];
  const totalSessions = sessions.length;
  const uniqueSurahs = new Set(sessions.map(s => s.surah_id)).size;

  let averageAccuracy = null;
  if (sessions.length > 0) {
    let totalAccuracy = 0;
    let count = 0;
    sessions.forEach(s => {
      if (s.accuracy !== null && s.accuracy !== undefined) {
        const val = Number(s.accuracy);
        if (!Number.isNaN(val)) {
          totalAccuracy += val;
          count += 1;
        }
      }
    });
    if (count > 0) {
      averageAccuracy = Math.round(totalAccuracy / count);
    }
  }

  const withChange = Array.isArray(confidenceData) ? confidenceData.filter(
    item => typeof item.change === 'number' && !Number.isNaN(Number(item.change))
  ) : [];

  let mostImproved = null;
  let mostDeclined = null;

  if (withChange.length > 0) {
    mostImproved = withChange.reduce((best, current) => {
      if (!best) return current;
      return current.change > best.change ? current : best;
    }, null);

    mostDeclined = withChange.reduce((worst, current) => {
      if (!worst) return current;
      return current.change < worst.change ? current : worst;
    }, null);

    if (!mostImproved || mostImproved.change <= 0) {
      mostImproved = null;
    }

    if (!mostDeclined || mostDeclined.change >= 0) {
      mostDeclined = null;
    }
  }

  let consistencyMessage = "This week is a gentle starting point. Aim to recite a little more next week, with a calm heart.";

  if (totalSessions >= 7 && averageAccuracy !== null && averageAccuracy >= 75) {
    consistencyMessage = "Alhamdulillah, your recitation this week was steady and strong. Keep this beautiful rhythm.";
  } else if (totalSessions >= 4) {
    consistencyMessage = "You showed good effort this week. A few more focused sessions can deepen your consistency.";
  }

  if (delta !== null) {
    if (delta > 0) {
      consistencyMessage += " Your weekly health is trending upward—may Allah keep your Hifz firm.";
    } else if (delta < 0) {
      consistencyMessage += " Your weekly health dipped slightly—take it as a soft reminder, not a burden.";
    }
  }

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto px-4 pt-8 pb-32"
      >
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 glass-card hover:bg-white/10 transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{t('weeklySummary')}</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-70">{today}</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <SpecialLoader message="Gathering Insights..." />
          </div>
        ) : error ? (
          <div className="text-center text-red-300 bg-red-900/40 p-6 rounded-2xl border border-red-500/30">
            <p className="mb-2 text-sm">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Weekly Health Score Circle */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card p-8 flex flex-col items-center relative overflow-hidden group"
            >
               <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
               <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 relative z-10">{t('hifzHealth')}</h2>
               
               <div className="relative w-40 h-40 flex items-center justify-center mb-6 z-10">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                    <motion.circle 
                      cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={440}
                      initial={{ strokeDashoffset: 440 }}
                      animate={{ strokeDashoffset: 440 - (440 * (currentHealth || 0)) / 100 }}
                      className="text-emerald-500"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-5xl font-black text-white leading-none">{currentHealth ?? '--'}</span>
                    <span className="text-[10px] font-bold text-emerald-400 mt-1">%</span>
                  </div>
               </div>
               
               {delta !== null && (
                <div className="flex items-center gap-2 relative z-10">
                  {delta > 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-black text-emerald-400">+{delta}% IMPROVED</span>
                    </div>
                  ) : delta < 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                      <ArrowDownRight className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-black text-amber-400">{delta}% DIP</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Steady Pace</span>
                  )}
                </div>
               )}
            </motion.div>

            {/* 2. Sessions Summary Grid */}
            <div className="grid grid-cols-3 gap-3">
               {[
                 { label: t('sessions'), val: totalSessions, color: 'text-blue-400', icon: Play },
                 { label: t('surahs'), val: uniqueSurahs, color: 'text-indigo-400', icon: BookOpen },
                 { label: t('accuracy'), val: averageAccuracy ? `${averageAccuracy}%` : '--', color: 'text-emerald-400', icon: Activity }
               ].map((item, idx) => (
                 <motion.div key={idx} className="glass-card p-4 flex flex-col items-center">
                    <item.icon className={`w-4 h-4 ${item.color} mb-2 opacity-80`} />
                    <span className="text-lg font-black text-white">{item.val}</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">{item.label}</span>
                 </motion.div>
               ))}
            </div>

            {/* 3. Improved & Needs Care Row */}
            <div className="grid grid-cols-1 gap-4">
              <motion.div className="glass-card p-5 border-l-4 border-l-emerald-500">
                <h3 className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">{t('mostImproved')}</h3>
                {mostImproved ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{getSurahName(mostImproved.surah_id)}</span>
                    <div className="flex items-center gap-1 text-emerald-400">
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs font-black">+{mostImproved.change}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No clear improvement detected yet.</p>
                )}
              </motion.div>

              <motion.div className="glass-card p-5 border-l-4 border-l-amber-500">
                <h3 className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em] mb-3">{t('needsCare')}</h3>
                {mostDeclined ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{getSurahName(mostDeclined.surah_id)}</span>
                    <div className="flex items-center gap-1 text-amber-400">
                      <TrendingDown className="w-3 h-3" />
                      <span className="text-xs font-black">{mostDeclined.change}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Maintaining gentle consistency.</p>
                )}
              </motion.div>
            </div>

            {/* 4. Consistency Insight */}
            <motion.div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center gap-3 mb-3">
                 <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Award className="w-4 h-4 text-emerald-400" />
                 </div>
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('stabilityLabel')}</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                {consistencyMessage}
              </p>
            </motion.div>

            {/* Bottom Back Button */}
            <div className="pt-8 flex flex-col items-center">
                <button 
                  onClick={() => navigate('/')}
                  className="group flex items-center gap-2 px-8 py-4 glass-card hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-widest">Back to Home</span>
                </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WeeklyReflection;

