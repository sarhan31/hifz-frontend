import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, Volume2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import VocalTract from '../components/VocalTract';
import { useLanguage } from '../context/LanguageContext';
import makhrajData from '../data/makhrajData.json';

const MakhrajPractice = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [selectedLetter, setSelectedLetter] = useState(null);
  const SKIP_LOCAL_AUDIO = true; // Set to false once files are uploaded to public/makhraj/


  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Helper to get description based on language
  const getDescription = (letterData) => {
    switch (language) {
      case 'hi': return letterData.place_hi;
      case 'gu': return letterData.place_gu;
      case 'ur': return letterData.place_ur;
      default: return letterData.place_en;
    }
  };

  const playAudio = (audioPath, letter) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsPlaying(true);

    // Skip local audio and go straight to TTS if files are missing
    if (SKIP_LOCAL_AUDIO) {
        handleTTS();
        return;
    }

    // Primary: Try local audio file
    const audio = new Audio(audioPath);
    audioRef.current = audio;


    const handleTTS = () => {
        // High Quality Arabic TTS Fallback
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(letter);
            utterance.lang = 'ar-SA'; 
            utterance.rate = 0.7; // Slightly slower for clarity
            utterance.pitch = 1.1; // Slightly higher for better resonance
            
            const voices = window.speechSynthesis.getVoices();
            // Try to find a premium/natural Arabic voice if available
            const arabicVoice = voices.find(v => v.lang.includes('ar') && (v.name.includes('Natural') || v.name.includes('Premium'))) 
                             || voices.find(v => v.lang.includes('ar'));
            
            if (arabicVoice) utterance.voice = arabicVoice;

            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);
            
            window.speechSynthesis.cancel(); 
            window.speechSynthesis.speak(utterance);
        } else {
            setIsPlaying(false);
        }
    };

    audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
    };

    audio.onerror = () => {
        // If file is missing (404), seamlessly switch to TTS
        handleTTS();
    };

    // Use a small timeout to let the error handler catch missing files
    audio.play().catch(() => {
        // Catches "NotSupportedError" or missing files
        handleTTS();
    });
  };


  React.useEffect(() => {
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30">
        <div className="max-w-md mx-auto px-4 pt-8 pb-32">
            {/* Header */}
            <header className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-3 glass-card hover:bg-white/10 transition-all active:scale-90"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Makhraj Practice</h1>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-70">Articulation Points • Arabic Voice Mode</p>
                </div>

              </div>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-3">
                {Object.keys(makhrajData).map((letter) => (
                    <motion.div
                        key={letter}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedLetter(letter)}
                        className="aspect-square glass-card flex items-center justify-center cursor-pointer hover:bg-emerald-500/5 transition-all group"
                    >
                        <span className="text-4xl md:text-5xl font-arabic group-hover:text-emerald-400 transition-colors">{letter}</span>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Modal */}
        <AnimatePresence>
            {selectedLetter && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    onClick={() => setSelectedLetter(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="glass-card bg-slate-900/90 p-8 w-full max-w-sm relative overflow-hidden"
                    >
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                        
                        <button 
                            onClick={() => setSelectedLetter(null)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                        >
                            <X className="w-6 h-6 text-slate-400" />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                            <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                <span className="text-6xl font-arabic text-white">{selectedLetter}</span>
                            </div>
                            
                            <div className="space-y-2 w-full">
                                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Articulation Point</h3>
                                <p className="text-sm font-medium text-slate-200 leading-relaxed">
                                    {getDescription(makhrajData[selectedLetter])}
                                </p>
                            </div>

                            {/* Diagram Visualization */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="w-full h-48 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden"
                            >
                                <VocalTract 
                                    activeLetter={selectedLetter} 
                                    articulationPoint={makhrajData[selectedLetter].articulation} 
                                />
                            </motion.div>

                            <button
                                onClick={() => playAudio(makhrajData[selectedLetter].audio, selectedLetter)}
                                disabled={isPlaying}
                                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                                    isPlaying 
                                    ? 'bg-emerald-900/50 text-emerald-500 border border-emerald-500/30 cursor-wait' 
                                    : 'bg-emerald-600 text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:bg-emerald-500'
                                }`}
                            >
                                {isPlaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                                <span>{isPlaying ? "Playing..." : "Play Sound"}</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default MakhrajPractice;
