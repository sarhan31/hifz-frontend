import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Activity, ArrowLeft, Flame, Calendar, TrendingUp, Target, CheckCircle } from 'lucide-react';
import SpecialLoader from '../components/SpecialLoader';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;
const PROTECTED_SURAHS = [1];

const ContributionGraph = ({ data }) => {
  const weeks = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort data by date just in case
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // We want to align to weeks starting Sunday.
    const startDate = new Date(sortedData[0].date);
    const startDayOfWeek = startDate.getDay(); // 0=Sun
    
    // Pad the beginning with nulls
    const paddedData = Array(startDayOfWeek).fill(null).concat(sortedData);
    
    const weeks = [];
    let currentWeek = [];
    
    paddedData.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Push last partial week if any
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [data]);

  const getIntensityClass = (count) => {
    if (count === 0) return 'bg-[#161b22] border border-[#30363d]';
    if (count <= 2) return 'bg-[#0e4429] border border-[#0e4429]';
    if (count <= 4) return 'bg-[#006d32] border border-[#006d32]';
    if (count <= 6) return 'bg-[#26a641] border border-[#26a641]';
    return 'bg-[#39d353] border border-[#39d353]';
  };

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
       {/* Day Labels */}
       <div className="flex flex-col gap-1 mr-2 text-xs text-slate-500 pt-6 shrink-0">
          <div className="h-4"></div>
          <div className="h-4 flex items-center leading-none">Mon</div>
          <div className="h-4"></div>
          <div className="h-4 flex items-center leading-none">Wed</div>
          <div className="h-4"></div>
          <div className="h-4 flex items-center leading-none">Fri</div>
          <div className="h-4"></div>
       </div>

       <div className="flex flex-col gap-1">
          {/* Month Labels */}
          <div className="flex text-xs text-slate-500 h-5 relative mb-1">
             {weeks.map((week, idx) => {
                const firstDay = week.find(d => d);
                if (!firstDay) return <div key={idx} className="w-4 mr-1 shrink-0"></div>;
                
                const d = new Date(firstDay.date);
                const showMonth = d.getDate() <= 7;
                
                return (
                   <div key={idx} className="w-4 mr-1 relative shrink-0">
                      {showMonth && (
                        <span className="absolute top-0 left-0 whitespace-nowrap">
                          {d.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      )}
                   </div>
                );
             })}
          </div>
          
          {/* Grid */}
          <div className="flex gap-1">
             {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                   {week.map((day, dIdx) => {
                      const count = day ? (day.count || 0) : 0;
                      return (
                         <div 
                           key={dIdx}
                           className={`sm:w-4 sm:h-4 w-3 h-3 rounded-[2px] ${day ? getIntensityClass(count) : 'bg-transparent'}`}
                           title={day ? `${day.date}: ${count} tests` : ''}
                         />
                      );
                   })}
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

const HuffazDashboard = () => {
  const { t, language } = useLanguage();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  
  // Data States
  const [surahList, setSurahList] = useState([]);
  const [confidenceData, setConfidenceData] = useState([]);
  const [declineAlerts, setDeclineAlerts] = useState([]);
  const [stabilityData, setStabilityData] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [memoryAnchors, setMemoryAnchors] = useState([]);
  
  // New Feature States
  const [disciplineStats, setDisciplineStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    weeklyConsistency: 0,
    activityHeatmap: []
  });
  const [revisionPlan, setRevisionPlan] = useState([]);
  const [todaySummary, setTodaySummary] = useState({ sessions_completed: 0, avg_accuracy: 0, avg_fluency: 0 });
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const userId = user.id;
        const headers = {};

        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const [
          surahsRes, 
          confidenceRes, 
          declineRes, 
          stabilityRes, 
          riskRes,
          streakRes,
          planRes,
          anchorsRes,
          summaryRes,
          suggestionsRes
        ] = await Promise.all([
          axios.get(`${API_URL}/api/quran/surahs`),
          axios.get(`${API_URL}/api/surah-confidence/${userId}`, { headers }),
          axios.get(`${API_URL}/api/decline-alerts/${userId}`, { headers }),
          axios.get(`${API_URL}/api/surah-stability/${userId}`, { headers }),
          axios.get(`${API_URL}/api/surah-risk/${userId}`, { headers }),
          axios.get(`${API_URL}/api/streak/${userId}`, { headers }).catch(() => ({ data: {} })), 
          axios.get(`${API_URL}/api/revision-plan/today/${userId}`, { headers }).catch(() => ({ data: [] })), 
          axios.get(`${API_URL}/api/word-mistakes/anchors/${userId}`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/api/recitation-sessions/today/${userId}`, { headers }).catch(() => ({ data: { sessions_completed: 0, avg_accuracy: 0, avg_fluency: 0 } })),
          axios.get(`${API_URL}/api/revision-plan/suggestions/${userId}`, { headers }).catch(() => ({ data: [] }))
        ]);

        setSurahList(surahsRes.data || []);
        setConfidenceData(confidenceRes.data || []);
        setDeclineAlerts(declineRes.data || []);
        setStabilityData(stabilityRes.data || []);
        setRiskData(riskRes.data || []);
        setMemoryAnchors(anchorsRes.data || []);
        setTodaySummary(summaryRes.data);
        setAiSuggestions(suggestionsRes.data || []);
        
        setDisciplineStats(streakRes.data || {
          currentStreak: 0,
          longestStreak: 0,
          weeklyConsistency: 0,
          activityHeatmap: []
        });

        const planData = planRes.data || {};
        const flatPlan = [];
        if (planData.sabaq) flatPlan.push({ ...planData.sabaq, surah_id: planData.sabaq.surah, label: 'Sabaq' });
        if (Array.isArray(planData.sabaqi)) planData.sabaqi.forEach(s => flatPlan.push({ ...s, surah_id: s.surah, label: 'Sabaqi' }));
        if (Array.isArray(planData.manzil)) planData.manzil.forEach(m => flatPlan.push({ ...m, surah_id: m.surah, label: 'Manzil' }));
        
        setRevisionPlan(flatPlan);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError('errorHifzHealthData');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, session]);

  const getLocale = lang => {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'gu': return 'gu-IN';
      case 'ur': return 'ur-PK';
      default: return 'en-US';
    }
  };

  const getSurahName = surahNumber => {
    const num = Number(surahNumber);
    const match = surahList.find(s => s.id === num);
    if (!match) return `${t('surah')} ${surahNumber}`;
    return match.transliteration || match.name || `${t('surah')} ${num}`;
  };

  const stabilityToScore = status => {
    if (status === 'Stable') return 100;
    if (status === 'Fluctuating') return 70;
    if (status === 'Unstable') return 40;
    return 70;
  };

  let hifzHealthScore = null;
  if (Array.isArray(confidenceData) && confidenceData.length > 0) {
    const allSurahs = confidenceData.map(conf => {
        const surahId = Number(conf.surah_id);
        const risk = (Array.isArray(riskData) ? riskData : []).find(r => Number(r.surah_id) === surahId);
        if (!risk) return null;
        const stability = (Array.isArray(stabilityData) ? stabilityData : []).find(s => Number(s.surah_id) === surahId);
        return {
          surah_id: surahId,
          confidence: Number(conf.confidence || 0),
          riskScore: Number(risk.riskScore || 0),
          stability: stability ? stability.stability : null
        };
      }).filter(Boolean);

    const eligibleSurahs = allSurahs.filter(s => !PROTECTED_SURAHS.includes(s.surah_id));

    if (eligibleSurahs.length === 0) {
      hifzHealthScore = 100;
    } else {
      const confidenceAvg = eligibleSurahs.reduce((sum, s) => sum + s.confidence, 0) / eligibleSurahs.length;
      const riskAvg = eligibleSurahs.reduce((sum, s) => sum + s.riskScore, 0) / eligibleSurahs.length;
      const stabilityAvg = eligibleSurahs.reduce((sum, s) => sum + stabilityToScore(s.stability), 0) / eligibleSurahs.length;
      let rawHealth = 0.5 * confidenceAvg + 0.3 * (100 - riskAvg) + 0.2 * stabilityAvg;
      hifzHealthScore = Math.round(Math.max(0, Math.min(100, rawHealth)));
    }
  }

  const today = new Date().toLocaleDateString(getLocale(language), {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const heatmapData = useMemo(() => {
    const data = [];
    const todayDate = new Date();
    const daysToGenerate = disciplineStats.activityHeatmap?.length > 30 ? disciplineStats.activityHeatmap.length : 365;
    
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = Array.isArray(disciplineStats.activityHeatmap) 
        ? disciplineStats.activityHeatmap.find(h => h.date === dateStr)
        : null;
      
      data.push({
        date: dateStr,
        count: dayData ? dayData.count : 0
      });
    }
    return data;
  }, [disciplineStats.activityHeatmap]);

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto px-4 pt-8 pb-32"
      >
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-3 glass-card hover:bg-white/10 transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{t('hifzHealth')}</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-70">{today}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="p-3 glass-card hover:bg-white/10 transition-all active:scale-90"
          >
            <Brain className="w-5 h-5 text-slate-400" />
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
             <SpecialLoader message="Analyzing Performance..." />
          </div>
        ) : error ? (
            <div className="text-center text-red-300 bg-red-900/40 p-6 rounded-2xl border border-red-500/30">
               <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
               <p>{t(error)}</p>
               <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors">
                   Retry
               </button>
            </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. Streak & Consistency Section */}
            <div className="grid grid-cols-1 gap-4">
              {/* Streak Card */}
              <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('currentStreak')}</h3>
                  </div>
                  <div className="text-4xl font-black text-white mb-1">
                    {disciplineStats.currentStreak} <span className="text-xs text-slate-500 font-bold uppercase">{t('days')}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-bold">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    LONGEST: <span className="text-emerald-400">{disciplineStats.longestStreak} DAYS</span>
                  </div>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 relative z-10">
                   <Flame className="w-8 h-8 text-orange-500" />
                </div>
              </div>

              {/* Consistency Card */}
              <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('stabilityLabel')}</h3>
                  </div>
                  <div className="text-4xl font-black text-white mb-1">
                    {Math.round(disciplineStats.weeklyConsistency || 0)}%
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Last 7 Days Activity
                  </p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 relative z-10">
                   <Target className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
            </div>

            {/* Today's Summary */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{t('todayPerformance')}</h2>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{t('summary')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Sessions</div>
                  <div className="text-xl font-black text-white">{todaySummary.sessions_completed}</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Accuracy</div>
                  <div className="text-xl font-black text-emerald-400">{todaySummary.avg_accuracy}%</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                  <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Fluency</div>
                  <div className="text-xl font-black text-blue-400">{todaySummary.avg_fluency}%</div>
                </div>
              </div>
            </div>

            {/* Today's Plan */}
            <div className="glass-card p-6">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-emerald-500/10 rounded-xl">
                   <Calendar className="w-5 h-5 text-emerald-400" />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-white tracking-tight">Revision Plan</h2>
                   <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Daily Tasks</p>
                 </div>
               </div>
               
               {revisionPlan && revisionPlan.length > 0 ? (
                 <div className="space-y-3">
                   {revisionPlan.map((item, idx) => (
                     <div key={idx} className="flex items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all group active:scale-[0.98]">
                       <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black text-slate-300 mr-4 group-hover:bg-emerald-500/20 group-hover:text-emerald-200 transition-colors">
                         {item.surah_id}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="text-sm font-bold text-white truncate">{getSurahName(item.surah_id)}</div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {item.ayahs ? `Ayahs: ${item.ayahs}` : 'Full Surah'}
                         </div>
                       </div>
                       <CheckCircle className="w-5 h-5 text-slate-700 ml-auto group-hover:text-emerald-500 transition-colors" />
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                   <Calendar className="w-8 h-8 mx-auto mb-3 opacity-20 text-slate-400" />
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No Plan Today</p>
                   <button onClick={() => navigate('/planner')} className="mt-4 text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-[0.2em]">
                     Generate Plan
                   </button>
                 </div>
               )}
            </div>

            {/* AI Recommendations Section */}
            {aiSuggestions.length > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">AI Insights</h2>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Recommendations</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group active:scale-[0.98]">
                      <div className="flex flex-col min-w-0 flex-1 mr-4">
                        <span className="text-sm font-bold text-white truncate">
                          {suggestion.surah_name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold italic truncate">
                          {suggestion.reason}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/hifz-test?surah=${suggestion.surah_id}`)}
                        className="shrink-0 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-wider hover:bg-blue-500/20 transition-all border border-blue-500/20"
                      >
                        Revise
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Heatmap */}
            <div className="glass-card p-6">
               <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-indigo-500/10 rounded-xl">
                   <Activity className="w-5 h-5 text-indigo-400" />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-white tracking-tight">Activity History</h2>
                   <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Last 365 Days</p>
                 </div>
               </div>

               <div className="flex flex-col items-start w-full overflow-x-auto no-scrollbar">
                 <ContributionGraph data={heatmapData} />
                 
                 <div className="mt-6 flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest self-end">
                   <span>Less</span>
                   <div className="flex gap-1">
                     <div className="w-3 h-3 rounded-[2px] bg-[#161b22] border border-[#30363d]"></div>
                     <div className="w-3 h-3 rounded-[2px] bg-[#0e4429]"></div>
                     <div className="w-3 h-3 rounded-[2px] bg-[#006d32]"></div>
                     <div className="w-3 h-3 rounded-[2px] bg-[#26a641]"></div>
                     <div className="w-3 h-3 rounded-[2px] bg-[#39d353]"></div>
                   </div>
                   <span>More</span>
                 </div>
               </div>
            </div>

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

export default HuffazDashboard;
