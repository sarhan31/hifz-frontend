import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Play, Pause, Mic, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';

const API_URL = import.meta.env.VITE_API_URL;

const RecitationHistory = () => {
  const { t, language } = useLanguage();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [surahList, setSurahList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingUrl, setPlayingUrl] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const userId = user?.id;
    if (!userId) return;

    const fetchData = async () => {
      try {
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        
        const [logsRes, sessionsRes, surahsRes] = await Promise.all([
          axios.get(`${API_URL}/api/recitation-log/${userId}`, { headers }),
          axios.get(`${API_URL}/api/recitation-sessions/weekly/${userId}`, { headers }), // Using weekly to get last 14 days
          axios.get(`${API_URL}/api/quran/surahs`)
        ]);

        // Combine logs and sessions into a unified list
        const combinedLogs = [
          ...(logsRes.data || []).map(log => ({ ...log, type: 'log' })),
          ...(sessionsRes.data?.sessionsLast7Days || []).map(s => ({ 
            ...s, 
            type: 'session', 
            surah_number: s.surah_id,
            // Map session fields to match log structure for rendering
          })),
          ...(sessionsRes.data?.sessionsPrev7Days || []).map(s => ({ 
            ...s, 
            type: 'session', 
            surah_number: s.surah_id
          }))
        ];

        setLogs(combinedLogs);
        setSurahList(surahsRes.data || []);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, session?.access_token]);

  const handlePlayAudio = (url) => {
    if (!url) return;
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

  const getSurahName = (surahNumber) => {
    const num = Number(surahNumber);
    const match = surahList.find(s => s.id === num);
    return match ? `${num}. ${match.name}` : `Surah ${num}`;
  };

  // Group logs by date
  const groupedLogs = [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).reduce((groups, log) => {
    const date = new Date(log.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
    return groups;
  }, {});

  return (
    <div className="min-h-screen font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-[100] bg-inherit backdrop-blur-xl border-b border-white/10 px-4 h-[70px] flex items-center gap-4">
        <button 
          onClick={() => navigate('/')}
          className="p-3 glass-card hover:bg-white/10 transition-all active:scale-90"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t('recitationHistory')}</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">{t('unifiedLog')}</p>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 glass-card animate-pulse" />
            ))}
          </div>
        ) : logs.length > 0 ? (
          Object.keys(groupedLogs).map(date => (
            <div key={date} className="mb-10">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 flex items-center gap-2 ml-1">
                <Calendar className="w-3 h-3 text-emerald-500" /> {date}
              </h2>
              <div className="space-y-3">
                {groupedLogs[date].map((log) => (
                  <motion.div 
                    key={log.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 glass-card active:scale-[0.98] transition-all group"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{getSurahName(log.surah_number)}</span>
                        {log.type === 'session' && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                            TEST
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {log.type === 'session' ? `Accuracy: ${log.accuracy}%` : `Ayahs: ${log.ayah_start}-${log.ayah_end}`}
                        </span>
                        {log.duration_seconds && (
                          <span className="text-[10px] text-slate-600 font-bold">• {Math.floor(log.duration_seconds / 60)}M {log.duration_seconds % 60}S</span>
                        )}
                      </div>
                    </div>
                    {log.audio_url ? (
                      <button
                        onClick={() => handlePlayAudio(log.audio_url)}
                        className={`p-3 rounded-full transition-all ${playingUrl === `${API_URL}${log.audio_url}` ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-white/5'}`}
                      >
                        {playingUrl === `${API_URL}${log.audio_url}` ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>
                    ) : log.type === 'session' && (
                      <div className="flex flex-col items-end">
                        <span className={`text-[10px] font-black tracking-widest ${log.accuracy >= 90 ? 'text-emerald-400' : log.accuracy >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {log.accuracy >= 90 ? 'STRONG' : log.accuracy >= 75 ? 'GOOD' : 'REVISE'}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState 
            icon={Mic} 
            title="No History Yet" 
            description="Your recitation journey begins with the first verse." 
          />
        )}
      </div>

      {/* Bottom Navigation spacer/CTA */}
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
  );
};

export default RecitationHistory;
