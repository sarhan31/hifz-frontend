import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, ArrowLeft, RefreshCw, Star, BookOpen, Play, Pause, AlertTriangle, Activity, Timer, Square, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SurahBottomSheet from '../components/SurahBottomSheet';

const API_URL = import.meta.env.VITE_API_URL;

const Recitation = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [fluencyScore, setFluencyScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [audioURL, setAudioURL] = useState(null);
  const [motivationalMsg, setMotivationalMsg] = useState("");
  const [permissionError, setPermissionError] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    totalPauses: 0,
    longestPause: 0
  });

  const MOTIVATIONAL_MESSAGES = [
    "Verily, with hardship comes ease. (Surah Ash-Sharh 94:6)",
    "The best of you are those who learn the Quran and teach it. (Sahih Al-Bukhari)",
    "Recite and rise in degrees, for your rank will be at the last verse you recite. (Tirmidhi)",
    "And We have certainly made the Quran easy for remembrance. (Surah Al-Qamar 54:17)",
    "Allah loves those who are consistent, even if it is little. (Sahih Muslim)",
    "Keep going! Every letter you recite brings ten rewards. (Tirmidhi)"
  ];
  
  const [alignedWords, setAlignedWords] = useState([]);
  const [words, setWords] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [surahList, setSurahList] = useState([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const recognitionRef = useRef(null);
  const expectedTextRef = useRef("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const statsRef = useRef({
    startTime: 0,
    longPauseCount: 0,
    silenceStartTime: null,
    isSpeaking: false,
    maxPauseDuration: 0,
    totalPausedDuration: 0,
    pauseStartTime: null
  });

  const EXPECTED_DURATION_MIN = 15000; 
  const EXPECTED_DURATION_MAX = 45000; 
  const SILENCE_THRESHOLD = 20; 
  const PAUSE_DURATION_THRESHOLD = 1500; 

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ar-SA';

      recognition.onresult = async (event) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
        }

        try {
          const response = await axios.post(`${API_URL}/api/alignment`, {
            expectedText: expectedTextRef.current || fullTranscript.trim(),
            spokenText: fullTranscript.trim()
          });

          const comparison = response.data || [];
          setAlignedWords(comparison);

          setWords(prev => {
            if (!prev || prev.length === 0) return prev;

            const updated = prev.map((w, index) => {
              const align = comparison[index];
              if (!align) return w;

              let status = 'hidden';
              if (align.status === 'correct') {
                status = 'correct';
              } else if (align.status === 'minor') {
                status = 'minor';
              } else if (align.status === 'mismatch' || align.status === 'major') {
                status = 'major';
              } else if (align.status === 'missing') {
                status = 'hidden';
              }

              return { ...w, status };
            });

            const lastIndex = comparison.reduce((acc, item, index) => {
              if (item && item.status && item.status !== 'missing') {
                return index;
              }
              return acc;
            }, -1);

            if (lastIndex !== -1) {
              setCurrentWordIndex(lastIndex);
            }

            return updated;
          });
        } catch (err) {
          console.error("Alignment API error:", err);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

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

  const handleSelectSurah = async (surah) => {
    setSelectedSurah(surah);
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/quran/surah/${surah.id}`);
      const ayahs = response.data?.ayahs || [];
      const selectedAyahs = ayahs.slice(0, 5);

      const baseWords = selectedAyahs.flatMap(ayah => ayah.words || []);
      setWords(baseWords);

      const expected = selectedAyahs.map(ayah => ayah.text_ar).join(" ");
      expectedTextRef.current = expected;
      setLoading(false);
    } catch (error) {
      console.error("Error fetching surah for recitation:", error);
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);

  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    const now = Date.now();

    if (average > SILENCE_THRESHOLD) {
      if (statsRef.current.silenceStartTime) {
        const silenceDuration = now - statsRef.current.silenceStartTime;
        if (silenceDuration > PAUSE_DURATION_THRESHOLD) {
          statsRef.current.longPauseCount++;
          statsRef.current.longPauseDurations.push(silenceDuration);
          if (silenceDuration > statsRef.current.maxPauseDuration) {
            statsRef.current.maxPauseDuration = silenceDuration;
          }
        }
        statsRef.current.silenceStartTime = null;
      }
      statsRef.current.isSpeaking = true;
    } else {
      if (!statsRef.current.silenceStartTime) {
        statsRef.current.silenceStartTime = now;
      }
    }

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  const processRecording = async (blob, fluencyScoreValue, feedbackText, accuracyScoreValue) => {
    const finalFluency = fluencyScoreValue !== undefined ? fluencyScoreValue : 75;
    const finalFeedback = feedbackText || "Recitation processed.";
    
    setFluencyScore(finalFluency);
    setFeedback(finalFeedback);
    setShowResult(true);

    const formData = new FormData();
    const audioFile = new File([blob], "recitation.wav", { type: "audio/wav" });
    
    formData.append('audio', audioFile);
    formData.append('user_id', user?.id);
    formData.append('surah_number', 1);
    formData.append('ayah_start', 1);
    formData.append('ayah_end', 5);
    formData.append('fluency_score', finalFluency);

    try {
      await axios.post(`${API_URL}/api/recitation-log`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
    } catch (error) {
      console.error("Error saving recitation log:", error);
    }

    try {
      if (user?.id) {
        const headers = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const accuracyToSave = accuracyScoreValue !== undefined ? accuracyScoreValue : finalFluency;

        await axios.post(
          `${API_URL}/api/recitation-session`,
          {
            user_id: user.id,
            surah_id: 1,
            accuracy: accuracyToSave,
            mistake_count: statsRef.current.longPauseCount || 0
          },
          { headers }
        );
      }
    } catch (error) {
      console.error("Error saving recitation session:", error);
    }
  };

  const startRecording = async () => {
    try {
      setPermissionError(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      statsRef.current = {
        startTime: Date.now(),
        longPauseCount: 0,
        silenceStartTime: Date.now(),
        isSpeaking: false,
        maxPauseDuration: 0,
        totalPausedDuration: 0,
        pauseStartTime: null,
        longPauseDurations: []
      };

      analyzeAudio();

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        stream.getTracks().forEach(track => track.stop());

        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const endTime = Date.now();
        let duration = endTime - statsRef.current.startTime - statsRef.current.totalPausedDuration;
        
        if (statsRef.current.pauseStartTime) {
             duration -= (endTime - statsRef.current.pauseStartTime);
        }

        setSessionStats({
          duration: Math.round(duration / 1000),
          totalPauses: statsRef.current.longPauseCount,
          longestPause: parseFloat((statsRef.current.maxPauseDuration / 1000).toFixed(1))
        });
        
        let accuracyScore = 100;
        const pauses = statsRef.current.longPauseCount;
        
        accuracyScore -= (pauses * 5);
        
        let feedbackParts = [];
        
        if (pauses > 0) {
            feedbackParts.push(`${pauses} long pause${pauses > 1 ? 's' : ''} detected.`);
        }

        if (duration < EXPECTED_DURATION_MIN) {
            accuracyScore -= 5;
        } else if (duration > EXPECTED_DURATION_MAX) {
            accuracyScore -= 5;
        }

        accuracyScore = Math.max(50, accuracyScore);

        const pauseDurations = statsRef.current.longPauseDurations || [];
        const effectivePauseDurations =
          pauseDurations.length > 1 ? pauseDurations.slice(1) : [];

        const totalPauseMs = effectivePauseDurations.reduce(
          (sum, d) => sum + d,
          0
        );
        const pauseSeconds = totalPauseMs / 1000;
        const fluencyPenalty = pauseSeconds * 8;

        let fluencyScoreValue = Math.round(accuracyScore - fluencyPenalty);
        if (fluencyScoreValue < 0) fluencyScoreValue = 0;
        if (fluencyScoreValue > 100) fluencyScoreValue = 100;

        if (feedbackParts.length === 0) {
            feedbackParts.push("Excellent rhythm and flow!");
        }

        setMotivationalMsg(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);

        processRecording(
          audioBlob,
          fluencyScoreValue,
          feedbackParts.join(" "),
          accuracyScore
        );
      };

      mediaRecorderRef.current.start();
      
      if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.log("Recognition already started");
        }
      }

      setIsRecording(true);
      setIsPaused(false);
      setShowResult(false);
      setFluencyScore(0);
      setFeedback("");
      setAudioURL(null);
      setAlignedWords([]);
      setCurrentWordIndex(-1);
      setWords(prev =>
        prev.map(word => ({
          ...word,
          status: 'hidden'
        }))
      );
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermissionError(true);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      statsRef.current.pauseStartTime = Date.now();
      
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        audioContextRef.current.suspend();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      if (statsRef.current.pauseStartTime) {
        const pausedTime = Date.now() - statsRef.current.pauseStartTime;
        statsRef.current.totalPausedDuration += pausedTime;
        statsRef.current.pauseStartTime = null;
      }

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      analyzeAudio();
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("Recognition start error:", e);
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
        setPermissionError(false);
        setIsPreparing(true);
        
        setTimeout(() => {
          setIsPreparing(false);
          startRecording();
        }, 5000);
      } catch (err) {
        console.error("Microphone permission denied:", err);
        setPermissionError(true);
      }
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-emerald-900/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence>
        {isPreparing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm"
          >
            <div className="relative flex flex-col items-center text-center p-8">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]"
              />
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-4xl md:text-6xl font-arabic text-emerald-400 mb-8 leading-loose"
              >
                اللَّهُمَّ اجْعَلْنِي مِنْ أَهْلِ الْقُرْآنِ
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]"
              >
                Focus your heart...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-10 w-full max-w-md mx-auto px-4 pt-8 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="p-3 glass-card hover:bg-white/10 transition-all active:scale-90"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <button 
          onClick={() => setIsSelectorOpen(true)}
          className="flex flex-col items-center group"
        >
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            {selectedSurah ? selectedSurah.transliteration : "Select Surah"}
            <ChevronDown className="w-4 h-4 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 opacity-70">Recitation Mode</p>
        </button>
        <div className="w-11" />
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto px-4 py-12">
        {!selectedSurah ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full glass-card p-10 text-center"
          >
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
              <BookOpen className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-4 tracking-tight">Begin Reciting</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-10 font-medium">
              Choose a Surah to start your session. Our AI will analyze your rhythm and accuracy in real-time.
            </p>
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_15px_30px_rgba(16,185,129,0.2)] transition-all active:scale-95"
            >
              Select Surah
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div 
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center gap-12"
              >
                {/* Visualizer / Mic Section */}
                <div className="flex items-center justify-center gap-8">
                  <AnimatePresence>
                    {isRecording && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          isPaused ? resumeRecording() : pauseRecording();
                        }}
                        className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all border ${
                          isPaused 
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_10px_20px_rgba(16,185,129,0.3)]' 
                          : 'bg-white/5 text-amber-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <button 
                    onClick={toggleRecording}
                    className={`relative w-48 h-48 rounded-[56px] flex items-center justify-center transition-all duration-500 border-4 ${
                      isRecording 
                      ? 'bg-red-500/10 border-red-500/40 shadow-[0_20px_60px_rgba(239,68,68,0.2)]' 
                      : 'bg-emerald-500 text-white border-emerald-400 shadow-[0_20px_60px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    {isRecording && !isPaused && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-red-500 rounded-[56px] -z-10"
                      />
                    )}
                    {isRecording ? <Square className="w-12 h-12 fill-current" /> : <Mic className="w-12 h-12" />}
                  </button>
                </div>

                <div className="text-center">
                  <h3 className={`text-2xl font-black tracking-tight mb-2 ${isRecording ? (isPaused ? 'text-amber-400' : 'text-red-400 animate-pulse') : 'text-white'}`}>
                    {isRecording ? (isPaused ? "Paused" : "Recording...") : "Tap to Start"}
                  </h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    {isRecording ? "Recite clearly and naturally" : "Find a quiet space to begin"}
                  </p>
                </div>

                {/* Real-time Feedback Area */}
                <div className="w-full glass-card p-8 min-h-[160px] flex items-center justify-center">
                   {words.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-6" dir="rtl">
                        {words.map((item, index) => (
                          <motion.span 
                            key={index}
                            className={`text-3xl md:text-4xl font-arabic transition-all duration-500 ${
                              index === currentWordIndex ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' :
                              item.status === 'correct' ? 'text-emerald-400' :
                              item.status === 'minor' ? 'text-amber-300' :
                              item.status === 'major' ? 'text-red-400' : 'text-slate-700'
                            }`}
                          >
                            {item.text}
                          </motion.span>
                        ))}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center opacity-20">
                         <Activity className="w-8 h-8 text-slate-500 mb-2" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Feedback</span>
                      </div>
                   )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full glass-card p-10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20">
                    <Star className="w-10 h-10 text-emerald-400 fill-current" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Masha'Allah!</h2>
                  <p className="text-slate-400 text-sm font-medium italic mb-10 opacity-70 px-4">{motivationalMsg}</p>

                  <div className="grid grid-cols-2 gap-4 w-full mb-10">
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Fluency</p>
                      <p className="text-3xl font-black text-emerald-400">{fluencyScore}%</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Duration</p>
                      <p className="text-3xl font-black text-indigo-400">{sessionStats.duration}s</p>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <button 
                      onClick={() => setShowResult(false)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl transition-all active:scale-95"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={() => navigate('/')}
                      className="w-full glass-card hover:bg-white/10 text-slate-300 font-black text-xs uppercase tracking-[0.2em] py-5 border border-white/10 transition-all active:scale-95"
                    >
                      Return Home
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <footer className="relative z-10 w-full max-w-md mx-auto px-4 pb-12 flex justify-center">
        {!isRecording && !showResult && (
          <button 
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 px-8 py-4 glass-card hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Home</span>
          </button>
        )}
      </footer>

      <SurahBottomSheet 
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        surahList={surahList}
        selectedSurahId={selectedSurah?.id}
        onSelect={handleSelectSurah}
      />
    </div>
  );
};

export default Recitation;
