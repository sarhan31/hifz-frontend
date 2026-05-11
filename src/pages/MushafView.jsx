import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Mic, 
  Square, 
  Play, 
  ChevronDown, 
  Repeat, 
  PlayCircle, 
  ChevronRight,
  Loader2,
  X,
  Volume2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';
import SurahBottomSheet from '../components/SurahBottomSheet';
import AyahActionBottomSheet from '../components/AyahActionBottomSheet';
import SpecialLoader from '../components/SpecialLoader';

const API_URL = import.meta.env.VITE_API_URL;

const MushafView = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [surahList, setSurahList] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [ayahs, setAyahs] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isFontPanelOpen, setIsFontPanelOpen] = useState(false);
  const [activeAyah, setActiveAyah] = useState(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [recitationSpeed, setRecitationSpeed] = useState(1);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('mushafFontSize');
    return saved ? parseInt(saved) : 28; // Default 28px
  });
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [actionAyah, setActionAyah] = useState(null);
  const longPressTimeoutRef = useRef();

  const handlePointerDown = (ayah) => {
    longPressTimeoutRef.current = setTimeout(() => {
      setActionAyah(ayah);
      setIsActionSheetOpen(true);
    }, 500); // 500ms for long press
  };

  const handlePointerUp = () => {
    clearTimeout(longPressTimeoutRef.current);
  };
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const audioChunksRef = useRef([]);
  const ayahRefs = useRef({});
  const fontPanelRef = useRef(null); // Ref for the font panel

  const { setBottomNavVisible } = useUI();

  // Hide bottom nav on mount, show on unmount
  useEffect(() => {
    setBottomNavVisible(false);
    return () => setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  // Effect to handle clicks outside the font panel to close it
  useEffect(() => {
    if (!isFontPanelOpen) return;

    const handleClickOutside = (event) => {
      if (fontPanelRef.current && !fontPanelRef.current.contains(event.target)) {
        setIsFontPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFontPanelOpen]);

  // Fetch Surah List
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/quran/surahs`);
        setSurahList(response.data || []);
      } catch (error) {
        console.error("Error fetching surah list:", error);
      }
    };
    fetchSurahs();
  }, []);

  // Handle Initial Surah selection from Params
  useEffect(() => {
    if (!surahList.length) return;

    const surahParam = searchParams.get('surah');
    const id = surahParam ? Number(surahParam) : null;
    const initial = id ? surahList.find(s => s.id === id) : null;

    if (initial) {
      setSelectedSurah(initial);
    } else {
      setLoading(false); // Stop loading if no surah is selected to show the selection message
    }
  }, [surahList, searchParams]);

  // Fetch Ayahs when Surah changes
  useEffect(() => {
    if (!selectedSurah) return;

    const fetchSurah = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/quran/surah/${selectedSurah.id}`);
        setAyahs(response.data?.ayahs || []);
        setCurrentAyahIndex(0);
      } catch (error) {
        console.error("Error fetching ayahs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurah();
  }, [selectedSurah]);

  const [userIsScrolling, setUserIsScrolling] = useState(false);

  // Manual scroll detection
  useEffect(() => {
    const handleManualScroll = () => {
      if (autoScrollEnabled) {
        setUserIsScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        // Extended pause to 3s for better user control
        scrollTimeoutRef.current = setTimeout(() => setUserIsScrolling(false), 3000); 
      }
    };

    window.addEventListener('wheel', handleManualScroll, { passive: true });
    window.addEventListener('touchstart', handleManualScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleManualScroll);
      window.removeEventListener('touchstart', handleManualScroll);
    };
  }, [autoScrollEnabled]);

  // Professional Teleprompter Logic (Ultra-smooth 60fps scrolling)
  useEffect(() => {
    if (!autoScrollEnabled || userIsScrolling) {
      document.documentElement.style.scrollBehavior = 'smooth';
      return;
    }
    
    document.documentElement.style.scrollBehavior = 'auto';
    
    let lastTime = performance.now();
    let currentPos = window.scrollY;
    let animationFrameId;
    
    // Smooth speeds (Pixels per millisecond)
    const speedMap = { 1: 0.05, 2: 0.09, 3: 0.14 };
    const speed = speedMap[recitationSpeed] || 0.05;

    const performScroll = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Sub-pixel accurate calculation
      currentPos += speed * deltaTime;
      
      // Use scrollTo for precise absolute positioning (prevents rounding jitter)
      window.scrollTo(0, currentPos);
      
      animationFrameId = requestAnimationFrame(performScroll);
    };

    animationFrameId = requestAnimationFrame(performScroll);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      document.documentElement.style.scrollBehavior = 'smooth';
    };
  }, [autoScrollEnabled, recitationSpeed, userIsScrolling]);

  // Precise Jump-to-Ayah (Only for manual selections)
  useEffect(() => {
    // Only scroll into view if we're NOT in auto-scroll mode (teleprompter handles that)
    // or if we just manually changed the ayah index while paused
    if (!autoScrollEnabled && currentAyahIndex !== -1) {
      const activeAyahData = ayahs[currentAyahIndex];
      if (!activeAyahData) return;

      const element = document.getElementById(`ayah-${activeAyahData.ayah_number}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        });
      }
    }
  }, [currentAyahIndex, autoScrollEnabled, ayahs]);

  // High-Performance Progress tracking (Intersection Observer)
  useEffect(() => {
    if (ayahs.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index);
            // Instant update for the highlight
            setCurrentAyahIndex(index);
          }
        });
      },
      { 
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5], // Multiple thresholds for faster detection
        rootMargin: "-49.5% 0px -49.5% 0px" // Ultra-tight center window
      }
    );

    Object.values(ayahRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [ayahs]);

  const handleAyahClick = (ayah, index) => {
    if (activeAyah?.ayah?.id === ayah.id) {
      setActiveAyah(null);
    } else {
      // 1. First scroll to center for perfect visibility
      const element = document.getElementById(`ayah-${ayah.ayah_number}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
      
      // 2. Then show the menu with a slight delay
      setTimeout(() => {
        setActiveAyah({ ayah, index });
        if (!isRecording) setCurrentAyahIndex(index);
      }, 300);
    }
  };

  const handleReciteFromHere = async () => {
    if (!activeAyah) return;
    
    const { index } = activeAyah;
    
    // 1. Stop current recording if any
    if (isRecording) {
      stopRecording();
      // Wait a bit for state to clear
      await new Promise(r => setTimeout(r, 100));
    }
    
    // 2. Set new index
    setCurrentAyahIndex(index);
    
    // 3. Close menu
    setActiveAyah(null);
    
    // 4. Start new recording
    startRecording();
  };

  const handleSurahSelect = (surah) => {
    setSelectedSurah(surah);
    setSearchParams({ surah: surah.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        stream.getTracks().forEach(track => track.stop());
        
        // Upload logic
        if (user?.id && selectedSurah) {
          setIsSaving(true);
          try {
            const formData = new FormData();
            const audioFile = new File([audioBlob], `recitation_${selectedSurah.id}.webm`, { type: 'audio/webm' });
            
            formData.append('audio', audioFile);
            formData.append('user_id', user.id);
            formData.append('surah_number', selectedSurah.id);
            formData.append('fluency_score', 85); // Default score for Mushaf view recordings
            
            const headers = {
              'Content-Type': 'multipart/form-data'
            };
            if (session?.access_token) {
              headers.Authorization = `Bearer ${session.access_token}`;
            }

            await axios.post(`${API_URL}/api/recitation-log`, formData, { headers });
            console.log("Recitation stored successfully");
          } catch (error) {
            console.error("Error storing recitation:", error);
          } finally {
            setIsSaving(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayAyah = (ayah) => {
    if (!ayah) return;
    
    // Using Al-Quran Cloud / EveryAyah for fallback audio
    // Format: https://cdn.islamic.network/quran/audio/128/ar.alafasy/{surah_number}{ayah_number}.mp3
    // But we need to ensure surah/ayah are padded correctly (3 digits)
    const surahPadded = String(selectedSurah?.id).padStart(3, '0');
    const ayahPadded = String(ayah.ayah_number).padStart(3, '0');
    const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${selectedSurah?.id}${ayah.ayah_number}.mp3`;
    
    // We can also use a more robust URL format from Quran.com or similar
    const formattedUrl = `https://verses.quran.com/Alafasy/mp3/${surahPadded}${ayahPadded}.mp3`;
    
    setAudioURL(formattedUrl);
    
    // Wait for state to update then play
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      }
    }, 100);
    
    setActiveAyah(null);
  };

  const toggleAutoScroll = (speed) => {
    if (autoScrollEnabled && recitationSpeed === speed) {
      setAutoScrollEnabled(false);
    } else {
      setRecitationSpeed(speed);
      setAutoScrollEnabled(true);
    }
  };

  const handleFontSize = (newSize) => {
    const size = Math.min(Math.max(newSize, 22), 38);
    setFontSize(size);
    localStorage.setItem('mushafFontSize', size);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30">
      {/* Refined Header - Fixed at top */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 inset-x-0 z-[100] bg-slate-950/90 backdrop-blur-xl border-b border-white/10 px-4 h-[60px] flex items-center justify-between"
      >
        {/* Left: Back Arrow & Surah Name */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')}
            className="w-11 h-11 flex items-center justify-center -ml-2 rounded-full hover:bg-white/5 active:scale-90 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-slate-200" />
          </button>
          
          <button 
            onClick={() => setIsSelectorOpen(true)}
            className="flex flex-col items-start active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-bold text-white leading-none tracking-tight">
                {selectedSurah ? `Surah ${selectedSurah.transliteration}` : t('selectSurah')}
              </h1>
              <ChevronDown className="w-4 h-4 text-emerald-400" />
            </div>
            {selectedSurah && (
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                {ayahs.length} {t('ayahs')}
              </p>
            )}
          </button>
        </div>

        {/* Right: Font Control & Hifz Test */}
        <div className="flex items-center gap-2">
          {selectedSurah && (
            <div className="relative">
              <button 
                onClick={() => setIsFontPanelOpen(prev => !prev)}
                className="w-10 h-10 flex items-center justify-center text-lg font-serif text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
              >
                Aa
              </button>
              
              <AnimatePresence>
                {isFontPanelOpen && (
                    <motion.div
                      ref={fontPanelRef}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-14 right-0 w-64 glass-card p-5 z-[100] green-glow"
                    >
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{t('textSize')}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">A</span>
                        <input
                          type="range"
                          min="24"
                          max="36"
                          step="2"
                          value={fontSize}
                          onChange={(e) => handleFontSize(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <span className="text-lg text-slate-400">A</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 font-bold mt-2">
                        <span>24PX</span>
                        <span className="text-emerald-500">{fontSize}PX</span>
                        <span>36PX</span>
                      </div>
                      <button
                        onClick={() => handleFontSize(28)}
                        className="w-full mt-4 text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                      >
                        Reset to Default
                      </button>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {selectedSurah && (
            <button
              onClick={() => navigate('/hifz-test', { state: { surah: selectedSurah } })}
              className="px-4 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all shadow-lg shadow-emerald-950/40 active:scale-95 border border-emerald-400/20"
            >
              {t('hifzTest')}
            </button>
          )}
        </div>
      </motion.header>

      {/* Main Mushaf Content */}
      <main className="pt-20 pb-[140px] px-6 max-w-4xl mx-auto flex flex-col items-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <SpecialLoader message="Preparing Mushaf..." />
          </div>
        ) : !selectedSurah ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto"
          >
            <div className="w-24 h-24 glass-card green-glow rounded-full flex items-center justify-center mb-10 group">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse" />
              <Volume2 className="w-10 h-10 text-emerald-400 group-hover:scale-110 transition-transform relative z-10" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">{t('mushafView')}</h2>
            <p className="text-slate-400 mb-12 leading-relaxed text-sm font-medium italic">
              {t('mushafViewSubtitle')}
            </p>
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-[0.2em] py-5 rounded-[24px] shadow-[0_20px_50px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase border border-emerald-400/30"
            >
              <Mic className="w-5 h-5" />
              {t('selectSurah')}
            </button>
            
            <button 
              onClick={() => navigate('/')}
              className="mt-8 flex items-center gap-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-black uppercase tracking-widest"
            >
              <ArrowLeft className="w-3 h-3" />
              Go Back
            </button>
          </motion.div>
        ) : (
          <div className="w-full font-arabic mushaf-container" dir="rtl">
            {/* Status Indicators */}
            <div className="fixed right-4 top-24 z-[100] flex flex-col gap-2">
              <AnimatePresence>
                {autoScrollEnabled && (
                  <motion.div 
                    key="teleprompter-status"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full backdrop-blur-md"
                  >
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Teleprompter {recitationSpeed}x</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* NEW: Central Reading Guide Line (Teleprompter Only) */}
            <AnimatePresence>
              {autoScrollEnabled && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed top-1/2 left-0 right-0 h-px z-[50] pointer-events-none"
                >
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.1)]" />
                  {/* Side markers for the guide line */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full blur-[1px]" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full blur-[1px]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bismillah */}
            {selectedSurah?.id !== 1 && selectedSurah?.id !== 9 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-12 text-center"
              >
                <p className="text-4xl md:text-5xl font-arabic text-emerald-50/90 leading-relaxed">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <div className="w-32 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent mx-auto mt-8" />
              </motion.div>
            )}

            {/* Continuous Ayah Flow */}
            <div className="text-center leading-[3.5] md:leading-[4]">
              {ayahs.map((ayah, index) => (
                  <div
                    key={ayah.id || `ayah-${index}`}
                    id={`ayah-${ayah.ayah_number}`}
                    data-ayah={ayah.ayah_number}
                    ref={el => ayahRefs.current[index] = el}
                    data-index={index}
                    onPointerDown={() => handlePointerDown(ayah)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp} // Cancel long press if pointer leaves
                    onClick={() => handleAyahClick(ayah, index)}
                    className={`ayah-block ${
                      currentAyahIndex === index ? 'active-ayah' : ''
                    }`}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <span className="ayah-text font-arabic">
                      {ayah.text_ar}
                    </span>
                    <span className="ayah-separator">۝<span className="ayah-number">{ayah.ayah_number}</span></span>
                  </div>
              ))}
              
              {/* Bottom Back Button */}
              <div className="mt-12 mb-24 flex flex-col items-center">
                <button 
                  onClick={() => navigate('/')}
                  className="group flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded-full transition-all border border-white/5 active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-semibold">{t('returnHome')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <AyahActionBottomSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        ayah={actionAyah}
        onPlay={() => {
          handlePlayAyah(actionAyah);
          setIsActionSheetOpen(false);
        }}
        onRepeat={() => {
          // Placeholder for repeat logic
          setIsActionSheetOpen(false);
        }}
        onRecite={() => {
          handleReciteFromHere();
          setIsActionSheetOpen(false);
        }}
      />



      {/* Recitation Control Bar - Fixed exactly like BottomNav */}
      <AnimatePresence>
        {!isSelectorOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[999] bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 pb-safe shadow-[0_-15px_50px_rgba(0,0,0,0.6)]"
          >
            <div className="max-w-md mx-auto h-[76px] flex items-center justify-between px-6">
              {/* Speed Controls - Compact & Lighter */}
              <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-2xl">
                {[
                  { label: '1x', speed: 1 },
                  { label: '1.5x', speed: 2 },
                  { label: '2x', speed: 3 }
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => toggleAutoScroll(s.speed)}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl text-sm font-bold transition-all active:scale-90 ${
                      autoScrollEnabled && recitationSpeed === s.speed
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Main Action - Recite (Centered & Larger) */}
            <div className="relative">
              <button
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    if (currentAyahIndex === null) setCurrentAyahIndex(0);
                    startRecording();
                  }
                }}
                className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-full transition-all shadow-2xl active:scale-95 ${
                  isRecording 
                    ? 'bg-red-500 text-white ring-4 ring-red-500/20' 
                    : 'bg-emerald-500 text-white shadow-emerald-900/40 hover:bg-emerald-400'
                }`}
              >
                  {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
                  
                  {isRecording && (
                    <motion.span 
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 bg-red-500 rounded-full -z-10"
                    />
                  )}
                </button>
                
                <AnimatePresence>
                  {isRecording && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-red-500 rounded-full shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Listening...</span>
                      </div>
                    </motion.div>
                  )}
                  {isSaving && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-emerald-500 rounded-full shadow-lg flex items-center gap-2"
                    >
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Saving...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Play Button - Clean rounded-2xl */}
              <button
                disabled={!audioURL}
                onClick={() => audioRef.current?.play()}
                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-emerald-400 disabled:opacity-10 transition-all active:scale-90"
              >
                <Play className="w-7 h-7 fill-current ml-1" />
              </button>
            </div>
            
            {/* Progress Overlay - Float above the bar */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                Ayah {currentAyahIndex + 1} <span className="w-1 h-1 bg-slate-700 rounded-full" /> <span className="text-slate-500">{ayahs.length}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Element with Auto-Advance */}
      {audioURL && (
        <audio 
          ref={audioRef} 
          src={audioURL} 
          className="hidden" 
          onEnded={() => {
            if (currentAyahIndex < ayahs.length - 1) {
              const nextIndex = currentAyahIndex + 1;
              setCurrentAyahIndex(nextIndex);
              
              // Trigger jump-to-center for the next ayah
              const element = document.getElementById(`ayah-${ayahs[nextIndex].ayah_number}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              
              // Continue playing
              handlePlayAyah(ayahs[nextIndex]);
            }
          }}
        />
      )}

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

export default MushafView;
