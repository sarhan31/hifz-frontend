import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Repeat, 
  Clock, 
  ChevronDown, 
  List,
  Loader2,
  Settings2,
  Maximize2,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';
import SurahBottomSheet from '../components/SurahBottomSheet';
import SpecialLoader from '../components/SpecialLoader';

const API_URL = import.meta.env.VITE_API_URL;
const SUPABASE_PROJECT_ID = 'ckawytdgyoazhxhnvjzm';
const AUDIO_BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/quran-audio`;

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
  const [repeatMode, setRepeatMode] = useState('none'); // 'none' | 'one' | 'all'
  const [autoContinue, setAutoContinue] = useState(true);
  const [activeAyahIndex, setActiveAyahIndex] = useState(-1);
  
  // Refs
  const audioRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const ayahRefs = useRef({});

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
        
        // Select first surah by default if none selected
        if (response.data?.length > 0) {
          setSelectedSurah(response.data[0]);
        }
      } catch (error) {
        console.error("Error fetching surah list:", error);
      }
    };
    fetchSurahs();
  }, []);

  // Fetch Ayahs and Timings when Surah changes
  useEffect(() => {
    if (!selectedSurah) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Ayahs
        const ayahResponse = await axios.get(`${API_URL}/api/quran/surah/${selectedSurah.id}`);
        setAyahs(ayahResponse.data?.ayahs || []);
        
        // Fetch Timings (using Quran.com API for Al-Afasy as default)
        // Recitation ID 7 is Mishary Rashid Alafasy
        const timingResponse = await axios.get(`https://api.quran.com/api/v4/recitations/7/by_chapter/${selectedSurah.id}?per_page=300`);
        setTimings(timingResponse.data?.audio_segments || []);
        
        // Reset player state
        setCurrentTime(0);
        setActiveAyahIndex(-1);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      } catch (error) {
        console.error("Error fetching surah data/timings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSurah]);


  // Sync Active Ayah with Current Time
  useEffect(() => {
    if (!timings.length || !isPlaying) return;

    // Find the ayah that matches the current time
    // Timings are usually in milliseconds from Quran.com API
    const timeMs = currentTime * 1000;
    const index = timings.findIndex(t => timeMs >= t.timestamp_from && timeMs < t.timestamp_to);
    
    if (index !== -1 && index !== activeAyahIndex) {
      setActiveAyahIndex(index);
      
      // Auto-scroll to active ayah
      const element = ayahRefs.current[index];
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [currentTime, timings, activeAyahIndex, isPlaying]);

  // Audio Handlers
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime += 10;
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime -= 10;
    }
  };

  const changeSpeed = () => {
    const rates = [1, 1.25, 1.5, 0.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else if (autoContinue && selectedSurah && selectedSurah.id < 114) {
      const nextSurah = surahList.find(s => s.id === selectedSurah.id + 1);
      if (nextSurah) {
        setSelectedSurah(nextSurah);
        // Audio will start playing automatically after data fetch due to useEffect logic? 
        // No, let's trigger it.
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }, 1000);
      }
    } else {
      setIsPlaying(false);
    }
  };

  const handleSurahSelect = (surah) => {
    setSelectedSurah(surah);
    setIsSelectorOpen(false);
    setCurrentTime(0);
    
    // Auto-play when a surah is selected
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error("Auto-play failed:", err);
          setIsPlaying(false);
        });
      }
    }, 500); // Small delay to allow audio source to update
  };


  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const audioUrl = useMemo(() => {
    if (!selectedSurah) return '';
    const paddedId = String(selectedSurah.id).padStart(3, '0');
    return `${AUDIO_BASE_URL}/${paddedId}.mp3`;
  }, [selectedSurah]);

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col font-sans overflow-hidden">
      {/* Background Aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-[110] px-6 py-5 flex items-center justify-between backdrop-blur-xl bg-slate-950/40 border-b border-white/5 shadow-lg">
        <button 
          onClick={() => navigate('/')}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all"
        >
          <ArrowLeft className="w-6 h-6 text-slate-300" />
        </button>

        <div className="flex flex-col items-center">
          <button 
            onClick={() => setIsSelectorOpen(true)}
            className="flex flex-col items-center group active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400 border border-emerald-500/20">
                {selectedSurah?.id}
              </span>
              <h1 className="text-xl font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                {selectedSurah ? selectedSurah.transliteration : 'Select Surah'}
              </h1>
              <ChevronDown className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
              {ayahs.length} Ayahs • {selectedSurah?.name_arabic}
            </p>
          </button>
        </div>

        <button 
          onClick={() => setIsSelectorOpen(true)}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all border border-emerald-500/20"
        >
          <List className="w-6 h-6" />
        </button>
      </header>


      {/* Content Area - Quran Reading Interface */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative z-10 px-6 py-8" ref={scrollContainerRef}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <SpecialLoader message="Preparing Immersive Experience..." />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Bismillah */}
            {selectedSurah?.id !== 1 && selectedSurah?.id !== 9 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 text-center"
              >
                <h2 className="text-4xl md:text-5xl font-arabic text-emerald-50/90 leading-relaxed">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent mx-auto mt-6 rounded-full" />
              </motion.div>
            )}

            {/* Ayah Flow */}
            <div className="flex flex-col gap-8 md:gap-12" dir="rtl">
              {ayahs.map((ayah, index) => {
                const isActive = activeAyahIndex === index;
                const isPrevious = activeAyahIndex > index;
                
                return (
                  <motion.div
                    key={ayah.id}
                    ref={el => ayahRefs.current[index] = el}
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : isPrevious ? 0.4 : 0.6,
                      scale: isActive ? 1.02 : 1,
                    }}
                    className={`relative p-4 rounded-[32px] transition-all duration-700 ${
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
                        className={`font-arabic text-3xl md:text-4xl leading-[2] md:leading-[2.2] transition-colors duration-700 ${
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
                );
              })}
            </div>
            
            {/* End of Surah */}
            <div className="h-40 flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-slate-800 rounded-full mx-1" />
               <div className="w-1.5 h-1.5 bg-slate-800 rounded-full mx-1" />
               <div className="w-1.5 h-1.5 bg-slate-800 rounded-full mx-1" />
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Audio Controls */}
      <footer className="fixed bottom-0 left-0 right-0 z-[100] backdrop-blur-3xl bg-slate-950/90 border-t border-white/10 px-6 pt-4 pb-10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex flex-col gap-5">

          
          {/* Progress Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-slate-500 tracking-widest">{formatTime(currentTime)}</span>
              <span className="text-[10px] font-black text-slate-500 tracking-widest">{formatTime(duration)}</span>
            </div>
            <div className="relative h-6 flex items-center group">
              <input 
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500 group-hover:h-2 transition-all"
                style={{
                  background: `linear-gradient(to right, #10b981 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.05) ${(currentTime / duration) * 100}%)`
                }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Speed Toggle */}
            <button 
              onClick={changeSpeed}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-emerald-400 transition-all active:scale-90"
            >
              <span className="text-xs font-black">{playbackRate}x</span>
            </button>

            {/* Main Controls */}
            <div className="flex items-center gap-6">
              <button 
                onClick={skipBackward}
                className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              <button 
                onClick={togglePlay}
                className="w-16 h-16 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:scale-105 transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>

              <button 
                onClick={skipForward}
                className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
            </div>

            {/* Repeat Mode */}
            <button 
              onClick={() => {
                const modes = ['none', 'one', 'all'];
                const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
                setRepeatMode(next);
              }}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                repeatMode !== 'none' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-400'
              }`}
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === 'one' && <span className="absolute text-[8px] font-black mt-3">1</span>}
            </button>
          </div>
        </div>
      </footer>

      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        autoPlay={false}
      />

      {/* Surah Selector Bottom Sheet */}
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
