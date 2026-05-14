import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  ChevronDown, 
  List as ListIcon,
  Search,
  Volume2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { List as VirtualList, useDynamicRowHeight } from 'react-window';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';
import SurahBottomSheet from '../components/SurahBottomSheet';
import SpecialLoader from '../components/SpecialLoader';

const API_URL = import.meta.env.VITE_API_URL;
const SUPABASE_PROJECT_ID = 'ckawytdgyoazhxhnvjzm';
const AUDIO_BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/quran-audio`;

// --- Memoized Ayah Item Component ---
const AyahRow = React.memo(({ index, style, ayahs, activeAyahIndex }) => {
  const ayah = ayahs[index];
  const isActive = activeAyahIndex === index;
  const isPrevious = activeAyahIndex > index;

  if (!ayah) return null;

  return (
    <div style={style} className="px-6 py-2">
      <motion.div
        initial={false}
        animate={{
          opacity: isActive ? 1 : isPrevious ? 0.4 : 0.6,
          scale: isActive ? 1.02 : 1,
        }}
        className={`relative p-4 md:p-6 rounded-[32px] transition-all duration-700 ${
          isActive ? 'bg-emerald-500/5 shadow-[0_20px_50px_rgba(16,185,129,0.05)]' : ''
        }`}
      >
        {isActive && (
          <motion.div 
            layoutId="ayah-glow"
            className="absolute inset-0 bg-emerald-500/5 rounded-[32px] blur-xl -z-10"
          />
        )}
        
        <div className="flex flex-col items-center text-center">
          <p 
            className={`font-arabic text-3xl md:text-4xl leading-[2.2] transition-colors duration-700 ${
              isActive ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'text-slate-200'
            }`}
          >
            {ayah.text_ar}
            <span className="inline-flex items-center justify-center mr-4 w-10 h-10 rounded-full border border-emerald-500/20 text-xs font-bold text-emerald-500/60 font-sans align-middle">
              {ayah.ayah_number}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
});

// --- Skeleton Loader Component ---
const AyahSkeleton = () => (
  <div className="px-6 py-4 animate-pulse">
    <div className="h-32 bg-white/5 rounded-[32px] w-full" />
  </div>
);

const AudioPlayerPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { setBottomNavVisible } = useUI();
  
  // State
  const [surahList, setSurahList] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [ayahs, setAyahs] = useState([]);
  const [timings, setTimings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [repeatMode, setRepeatMode] = useState('none'); 
  const [autoContinue, setAutoContinue] = useState(true);
  const [activeAyahIndex, setActiveAyahIndex] = useState(-1);
  
  // Refs
  const audioRef = useRef(null);
  const listRef = useRef(null);
  const currentTimeRef = useRef(0);

  // Hide bottom nav
  useEffect(() => {
    setBottomNavVisible(false);
    return () => setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  // Fetch Surah List
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/quran/surahs`);
        setSurahList(response.data || []);
        if (response.data?.length > 0) {
          setSelectedSurah(response.data[0]);
        }
      } catch (error) {
        console.error("Error fetching surah list:", error);
      }
    };
    fetchSurahs();
  }, []);

  // Fetch Ayahs and Timings
  useEffect(() => {
    if (!selectedSurah) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [ayahResponse, timingResponse] = await Promise.all([
          axios.get(`${API_URL}/api/quran/surah/${selectedSurah.id}`),
          axios.get(`https://api.quran.com/api/v4/recitations/7/by_chapter/${selectedSurah.id}?per_page=300`)
        ]);

        setAyahs(ayahResponse.data?.ayahs || []);
        setTimings(timingResponse.data?.audio_segments || []);
        
        // Reset player
        setCurrentTime(0);
        currentTimeRef.current = 0;
        setActiveAyahIndex(-1);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      } catch (error) {
        console.error("Error fetching surah data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSurah]);

  // Performance-optimized Sync logic
  useEffect(() => {
    if (!timings.length) return;

    const syncAyah = () => {
      const timeMs = currentTimeRef.current * 1000;
      const index = timings.findIndex(t => {
        const start = t.timestamp_from ?? t.manual_timestamp_from;
        const end = t.timestamp_to ?? t.manual_timestamp_to;
        return timeMs >= start && timeMs < end;
      });

      if (index !== -1 && index !== activeAyahIndex) {
        setActiveAyahIndex(index);
        listRef.current?.scrollToRow({ index, align: 'center', behavior: 'smooth' });
      }
    };

    syncAyah();
  }, [currentTime, timings, activeAyahIndex]);

  // Handlers with useCallback
  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      currentTimeRef.current = time;
      if (Math.abs(time - currentTime) > 0.5) {
        setCurrentTime(time);
      }
    }
  }, [currentTime]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    currentTimeRef.current = time;
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime += 10;
    }
  }, []);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime -= 10;
    }
  }, []);

  const changeSpeed = useCallback(() => {
    const rates = [1, 1.25, 1.5, 0.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const handleSurahSelect = useCallback((surah) => {
    setSelectedSurah(surah);
    setIsSelectorOpen(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 500);
  }, []);

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else if (autoContinue && selectedSurah && selectedSurah.id < 114) {
      const nextSurah = surahList.find(s => s.id === selectedSurah.id + 1);
      if (nextSurah) handleSurahSelect(nextSurah);
    } else {
      setIsPlaying(false);
    }
  }, [repeatMode, autoContinue, selectedSurah, surahList, handleSurahSelect]);

  const formatTime = useCallback((time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const audioUrl = useMemo(() => {
    if (!selectedSurah) return '';
    const paddedId = String(selectedSurah.id).padStart(3, '0');
    return `${AUDIO_BASE_URL}/${paddedId}.mp3`;
  }, [selectedSurah]);

  // Use Dynamic Row Height Hook for the new react-window API
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: 180,
    key: selectedSurah?.id || 'default'
  });

  const rowProps = useMemo(() => ({
    ayahs,
    activeAyahIndex,
  }), [ayahs, activeAyahIndex]);

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col font-sans overflow-hidden">
      {/* Background Aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-[110] px-4 py-3 md:py-5 flex items-center justify-between backdrop-blur-xl bg-slate-950/40 border-b border-white/5 shadow-lg">
        <button onClick={() => navigate('/')} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-slate-300" />
        </button>

        <div className="flex flex-col items-center">
          <button onClick={() => setIsSelectorOpen(true)} className="flex flex-col items-center group active:scale-95 transition-transform">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[9px] md:text-[10px] font-black text-emerald-400 border border-emerald-500/20">
                {selectedSurah?.id}
              </span>
              <h1 className="text-base md:text-xl font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                {selectedSurah ? selectedSurah.transliteration : 'Select Surah'}
              </h1>
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
            </div>
            <p className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">
              {ayahs.length} Ayahs • {selectedSurah?.name_arabic}
            </p>
          </button>
        </div>

        <button onClick={() => setIsSelectorOpen(true)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all border border-emerald-500/20">
          <ListIcon className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </header>

      {/* Main Content - Virtualized List */}
      <main className="flex-1 relative z-10 pt-4">
        {loading ? (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto mt-8">
            <AyahSkeleton />
            <AyahSkeleton />
            <AyahSkeleton />
          </div>
        ) : (
          <VirtualList
            listRef={listRef}
            height={window.innerHeight - 200}
            rowCount={ayahs.length}
            rowHeight={dynamicRowHeight}
            width="100%"
            rowComponent={AyahRow}
            rowProps={rowProps}
            className="no-scrollbar"
          />
        )}
      </main>

      {/* Bottom Controls */}
      <footer className="fixed bottom-0 left-0 right-0 z-[120] backdrop-blur-3xl bg-slate-950/90 border-t border-white/10 px-6 pt-3 pb-6 md:pt-4 md:pb-10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex flex-col gap-3 md:gap-5">
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] md:text-[10px] font-black text-slate-500 tracking-widest">{formatTime(currentTime)}</span>
              <span className="text-[8px] md:text-[10px] font-black text-slate-500 tracking-widest">{formatTime(duration)}</span>
            </div>
            <div className="relative h-4 md:h-6 flex items-center group">
              <input 
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500 group-hover:h-1.5 transition-all"
                style={{ background: `linear-gradient(to right, #10b981 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.05) ${(currentTime / duration) * 100}%)` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={changeSpeed} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-emerald-400 transition-all active:scale-90">
              <span className="text-[10px] md:text-xs font-black">{playbackRate}x</span>
            </button>

            <div className="flex items-center gap-4 md:gap-6">
              <button onClick={skipBackward} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90">
                <SkipBack className="w-5 h-5 md:w-6 md:h-6 fill-current" />
              </button>
              <button onClick={togglePlay} className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:scale-105 transition-all active:scale-95">
                {isPlaying ? <Pause className="w-7 h-7 md:w-8 md:h-8 fill-current" /> : <Play className="w-7 h-7 md:w-8 md:h-8 fill-current ml-1" />}
              </button>
              <button onClick={skipForward} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90">
                <SkipForward className="w-5 h-5 md:w-6 md:h-6 fill-current" />
              </button>
            </div>

            <button onClick={() => setRepeatMode(r => r === 'none' ? 'one' : r === 'one' ? 'all' : 'none')} className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all active:scale-90 ${repeatMode !== 'none' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-400'}`}>
              <Repeat className="w-4 h-4 md:w-5 md:h-5" />
              {repeatMode === 'one' && <span className="absolute text-[8px] font-black mt-3">1</span>}
            </button>
          </div>
        </div>
      </footer>

      {/* Audio Element */}
      <audio 
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <SurahBottomSheet 
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        surahList={surahList}
        selectedSurahId={selectedSurah?.id}
        onSelect={handleSurahSelect}
      />
    </div>
  );
};

export default AudioPlayerPage;
