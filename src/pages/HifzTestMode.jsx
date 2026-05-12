import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
    Mic, ArrowLeft, BookOpen, Settings, X, Flame, 
    AlertCircle, Info, Bookmark, RotateCcw, LayoutGrid, 
    Hash, HelpCircle, ChevronRight, Play, Search, Trash2, Pause, FastForward
} from 'lucide-react';
import SpecialLoader from '../components/SpecialLoader';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL;

// --- Components ---

const WordItem = React.memo(({ word, currentIndex, visibilityMode, isFlashing, showHint, fontSize = 56 }) => {
    const isCurrent = word.globalIndex === currentIndex;
    const isRecited = word.globalIndex < currentIndex;

    // In 'visible' mode, we show everything. In 'hidden' (Test) mode, we follow progressive reveal.
    const shouldShowText = visibilityMode === 'visible' || isRecited || isCurrent;
    const shouldShowHint = isCurrent && showHint;

    return (
        <motion.span 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
                opacity: 1, 
                scale: isCurrent ? 1.08 : 1,
                y: isCurrent ? -2 : 0
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            className={`
                mx-0.5 sm:mx-1 px-1.5 py-1 rounded-xl transition-all duration-500 inline-block font-arabic relative
                ${isRecited
                    ? word.status === 'mistake'
                        ? 'text-red-400/90 line-through decoration-red-500/50'
                        : word.status === 'skipped'
                            ? 'text-slate-500/60'
                            : 'text-emerald-300 drop-shadow-[0_0_12px_rgba(110,231,183,0.5)]'
                    : isCurrent
                        ? isFlashing
                            ? 'text-red-500 scale-110 drop-shadow-[0_0_15px_rgba(239,68,68,1)] animate-pulse'
                            : 'text-white border-b-2 border-emerald-400 bg-emerald-500/20 shadow-[0_8px_20px_rgba(16,185,129,0.3)]'
                        : visibilityMode === 'visible'
                            ? 'text-gray-400 opacity-40'
                            : 'text-white/5 blur-[5px] select-none'
                }
                ${shouldShowHint ? '!text-white/30 !blur-0' : ''}
            `}
        >
            {isCurrent && !isFlashing && (
                <motion.div 
                    layoutId="current-glow"
                    className="absolute inset-0 bg-emerald-500/10 rounded-xl blur-lg -z-10"
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}
            {shouldShowText || shouldShowHint ? word.text : word.text.replace(/./g, 'ـ')}
        </motion.span>
    );
});

const SelectionCard = ({ icon: Icon, title, subtitle, onClick, color = "emerald" }) => (
    <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={`w-full h-14 sm:h-16 p-3 glass-card hover:bg-white/10 transition-all flex items-center gap-4 text-left group shadow-lg shadow-black/20`}
    >
        <div className={`p-2.5 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:bg-${color}-500/20 transition-colors`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm sm:text-base truncate">{title}</h3>
            {subtitle && <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate uppercase tracking-widest">{subtitle}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors flex-shrink-0" />
    </motion.button>
);

// --- Main Component ---

const HifzTestMode = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user, session } = useAuth();
    const { setBottomNavVisible } = useUI();
    const { t } = useLanguage();
    
    // UI States
    const [view, setView] = useState('menu'); // 'menu' | 'juz' | 'surah' | 'bookmarks' | 'test' | 'strength'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recitationSpeed, setRecitationSpeed] = useState(1.0);
    
    // Data States
    const [surahList, setSurahList] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [lastSession, setLastSession] = useState(null);
    const [selectedSurah, setSelectedSurah] = useState(null);
    const [words, setWords] = useState([]);
    const [strengthData, setStrengthData] = useState([]);
    const [streakCount, setStreakCount] = useState(0);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [resumeData, setResumeData] = useState(null);
    
    // Recitation States
    const [isListening, setIsListening] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mistakeFlash, setMistakeFlash] = useState(false);
    const [momentum, setMomentum] = useState({ text: "Ready to recite", icon: <Info className="w-3 h-3" />, color: "text-gray-400" });
    const [correctCount, setCorrectCount] = useState(0);
    const [majorMistakes, setMajorMistakes] = useState(0);
    const [minorMistakes, setMinorMistakes] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionConfidence, setDetectionConfidence] = useState(0);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [showSuccessRipple, setShowSuccessRipple] = useState(false);
    const [detectedSurahName, setDetectedSurahName] = useState("");
    const [detectedAyahNum, setDetectedAyahNum] = useState(1);
    const [ambiguousSurahs, setAmbiguousSurahs] = useState([]); // NEW: For disambiguation
    const [showHint, setShowHint] = useState(false);
    const [feedback, setFeedback] = useState("");
    
    // Fluency & Analytics States
    const [lastSpeechTime, setLastSpeechTime] = useState(null);
    const [pauseCount, setPauseCount] = useState({ short: 0, long: 0 });
    const [fluencyScore, setFluencyScore] = useState(100);
    const [flowStatus, setFlowStatus] = useState("smooth"); // "smooth" | "focus" | "struggling"
    const [analytics, setAnalytics] = useState(null);
    const [hesitationHint, setHesitationHint] = useState("");
    const [pronunciationIssues, setPronunciationIssues] = useState([]); // Array of issues found in session
    const [currentPronunciationIssue, setCurrentPronunciationIssue] = useState(null);
    const [fontSize, setFontSize] = useState(Number(localStorage.getItem('hifzFontSize')) || 56);

    // Test Config
    const [visibilityMode, setVisibilityMode] = useState('hidden'); // 'hidden' (Reveal) or 'visible' (Read)
    const [testMode, setTestMode] = useState('standard');
    const [strictness, setStrictness] = useState(localStorage.getItem('strictness') || 'Normal');
    const [tajweedMode, setTajweedMode] = useState(localStorage.getItem('tajweedMode') || 'NORMAL'); // 'OFF' | 'NORMAL' | 'STRICT'

    // Refs
    const recognitionRef = useRef(null);
    const wordsRef = useRef([]);
    const currentIndexRef = useRef(0);
    const viewRef = useRef('menu');
    const visibilityModeRef = useRef('hidden');
    const strictnessRef = useRef('Normal');
    const tajweedModeRef = useRef('NORMAL');
    const processedTranscriptRef = useRef(""); 
    const lastProcessedTranscriptRef = useRef("");
    const ayahRefs = useRef({});
    const flashTimeoutRef = useRef(null);
    const correctionTimerRef = useRef(null);
    const sessionSavedRef = useRef(false);
    const lastRecordedMistakeRef = useRef(null); 
    const detectTimerRef = useRef(null);
    const micStartTimeRef = useRef(null);
    const startDetectedRef = useRef(false);
    const isRecognitionActiveRef = useRef(false);
    const lastMistakeIndexRef = useRef(-1); 
    const lastMistakeTimeRef = useRef(0); 
    const lastMatchedTranscriptWordIndexRef = useRef(-1); 
    const surahListRef = useRef([]);
    const hintTimerRef = useRef(null);

    // Use a Ref to hold the latest handleSpeech function to bypass stale closures in useEffect
    const handleSpeechRef = useRef(null);
    useEffect(() => {
        handleSpeechRef.current = handleSpeech;
    });

    // Sync Refs
    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    useEffect(() => {
        wordsRef.current = words;
    }, [words]);

    useEffect(() => {
        viewRef.current = view;
    }, [view]);

    useEffect(() => {
        visibilityModeRef.current = visibilityMode;
    }, [visibilityMode]);

    useEffect(() => {
        strictnessRef.current = strictness;
    }, [strictness]);

    useEffect(() => {
        tajweedModeRef.current = tajweedMode;
        localStorage.setItem('tajweedMode', tajweedMode);
    }, [tajweedMode]);

    useEffect(() => {
        localStorage.setItem('hifzFontSize', fontSize);
    }, [fontSize]);

    useEffect(() => {
        surahListRef.current = surahList;
    }, [surahList]);

    useEffect(() => {
        if (fluencyScore >= 85) setFlowStatus("smooth");
        else if (fluencyScore >= 60) setFlowStatus("focus");
        else setFlowStatus("struggling");
    }, [fluencyScore]);

    // --- UI Effects ---

    // Scroll to current Ayah
    useEffect(() => {
        if (view === 'test' && currentIndex >= 0) {
            const currentAyahNum = words[currentIndex]?.ayahNumber;
            if (currentAyahNum && ayahRefs.current[currentAyahNum]) {
                ayahRefs.current[currentAyahNum].scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        }
    }, [currentIndex, view, words]);

    // Hint timer logic
    useEffect(() => {
        if (view === 'test' && isListening && !isPaused && !isCompleted) {
            clearTimeout(hintTimerRef.current);
            setShowHint(false);
            
            hintTimerRef.current = setTimeout(() => {
                setShowHint(true);
            }, 5000); // Show hint after 5 seconds
        } else {
            clearTimeout(hintTimerRef.current);
            setShowHint(false);
        }
        
        return () => clearTimeout(hintTimerRef.current);
    }, [currentIndex, isListening, isPaused, view, isCompleted]);

    // Auto-save progress when index changes significantly or on completion
    useEffect(() => {
        if (view === 'test' && user && selectedSurah && currentIndex > 0) {
            const currentAyah = words[currentIndex]?.ayahNumber || 1;
            // Only save every few words or on completion to avoid spamming
            if (currentIndex % 10 === 0 || isCompleted) {
                axios.post(`${API_URL}/api/bookmarks`, {
                    user_id: user.id,
                    surah_id: selectedSurah.id,
                    ayah_number: currentAyah,
                    type: isCompleted ? 'completed' : 'session'
                }, { headers: { Authorization: `Bearer ${session?.access_token}` } }).catch(() => {});
            }
        }
    }, [currentIndex, isCompleted, view, user, selectedSurah, words, session]);

    // --- Helpers ---

    const normalizeArabic = (text) => {
        if (!text) return "";
        return text
            .toLowerCase()
            .replace(/[ًٌٍَُِّْـ]/g, "") // Remove Harakat
            .replace(/[أإآٱ]/g, "ا") // Normalize Alifs
            .replace(/[ىيئ]/g, "ي") // Normalize Yaa
            .replace(/ة/g, "ه") // Normalize Taa Marbuta
            .replace(/ؤ/g, "و") // Normalize Hamza on Waw
            .replace(/ء/g, "") // Remove isolated Hamza
            .replace(/[\u064B-\u065F]/g, "") // Thoroughly remove all tashkeel
            // Phonetic collapse: Only for truly ambiguous sounds in recognition
            .replace(/[ثص]/g, "س") 
            .replace(/[ظذ]/g, "ز")
            .replace(/[ط]/g, "ت")
            .replace(/[ق]/g, "ك")
            .replace(/[^\u0621-\u064A\s]/g, "") // Keep only Arabic and spaces
            .replace(/\s+/g, " ") 
            .trim();
    };

    // --- Tajweed & Pronunciation Helpers ---

    const getLevenshteinDistance = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[b.length][a.length];
    };

    const calculatePhoneticSimilarity = (spoken, target) => {
        if (spoken === target) return 1.0;
        
        // 1. Levenshtein Base
        const dist = getLevenshteinDistance(spoken, target);
        const maxLen = Math.max(spoken.length, target.length);
        const levScore = 1 - (dist / maxLen);

        // 2. Bi-Gram Overlap (Better for phonetic sequences)
        const getBigrams = (str) => {
            const bigrams = new Set();
            for (let i = 0; i < str.length - 1; i++) {
                bigrams.add(str.substring(i, i + 2));
            }
            return bigrams;
        };
        const sGrams = getBigrams(spoken);
        const tGrams = getBigrams(target);
        const intersection = new Set([...sGrams].filter(x => tGrams.has(x)));
        const biGramScore = (intersection.size * 2) / (sGrams.size + tGrams.size) || 0;

        // 3. Hybrid Weighting (Weighted heavily towards bi-grams for Arabic flow)
        return (levScore * 0.4) + (biGramScore * 0.6);
    };

    const detectTajweedIssue = (spoken, target) => {
        if (spoken === target) return null;
        
        const similarity = calculatePhoneticSimilarity(spoken, target);
        
        // Letter errors (missing/wrong letters)
        if (similarity < 0.8 && similarity >= 0.6) {
            return { type: 'minor_pronunciation', message: "Check pronunciation" };
        } else if (similarity < 0.6) {
            return { type: 'major_pronunciation', message: "Major pronunciation error" };
        }
        
        // Detection of specific letters (Makhraj hints)
        if (target.includes('ق') && !spoken.includes('ق')) {
            return { type: 'makhraj', letter: 'ق', message: "Focus on 'ق' sound" };
        }
        if (target.includes('ط') && !spoken.includes('طق')) { // ط can sometimes sound like ق or ت
            return { type: 'makhraj', letter: 'ط', message: "Focus on 'ط' sound" };
        }

        return null;
    };

    const removePreliminaries = (text) => {
        let cleaned = normalizeArabic(text);
        // Remove "A'udhu billahi minashaitanir rajim" variations
        cleaned = cleaned.replace(/اعوذ بالله من الشيطان الرجيم/g, "");
        cleaned = cleaned.replace(/اعوذ بالله من الشيطان/g, "");
        // Remove "Bismillahir Rahmanir Rahim" variations
        cleaned = cleaned.replace(/بسم الله الرحمن الرحيم/g, "");
        cleaned = cleaned.replace(/بسم الله الرحمن/g, "");
        cleaned = cleaned.replace(/بسم الله/g, "");
        return cleaned.trim();
    };

    const getAccuracyValue = () => {
        // More realistic accuracy for speech (3% per major, 1% per minor)
        let calculatedAccuracy = 100 - majorMistakes * 3 - minorMistakes * 1;
        return Math.max(0, Math.min(100, Math.round(calculatedAccuracy)));
    };

    const filteredSurahs = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return surahList.filter(s => 
            s.transliteration.toLowerCase().includes(lowerTerm) || 
            s.name.toLowerCase().includes(lowerTerm) || 
            String(s.id).includes(lowerTerm)
        );
    }, [surahList, searchTerm]);

    // --- Initialization ---

    useEffect(() => {
        const init = async () => {
            try {
                const [surahsRes, bookmarksRes] = await Promise.all([
                    axios.get(`${API_URL}/api/quran/surahs`),
                    user ? axios.get(`${API_URL}/api/bookmarks`, { headers: { Authorization: `Bearer ${session?.access_token}` } }) : { data: [] }
                ]);
                setSurahList(surahsRes.data);
                setBookmarks(bookmarksRes.data);
                
                if (user) {
                    const [lastSessionRes, streakRes] = await Promise.all([
                        axios.get(`${API_URL}/api/bookmarks/last-session/${user.id}`),
                        axios.get(`${API_URL}/api/streak/${user.id}`)
                    ]);
                    setLastSession(lastSessionRes.data);
                    setStreakCount(streakRes.data.streak || 0);

                    // Check for auto-resume (if last session was recent and not completed)
                    if (lastSessionRes.data && !lastSessionRes.data.completed) {
                        const lastTime = new Date(lastSessionRes.data.updated_at).getTime();
                        if (Date.now() - lastTime < 24 * 60 * 60 * 1000) { // Within 24 hours
                            setResumeData(lastSessionRes.data);
                            setShowResumeModal(true);
                        }
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error("Init error:", err);
                setError("Failed to load data.");
                setLoading(false);
            }
        };
        init();
    }, [user, session]);

    // Handle incoming URL params
    useEffect(() => {
        if (!surahList.length) return;
        const surahParam = searchParams.get('surah');
        if (surahParam) {
            const surah = surahList.find(s => s.id === Number(surahParam));
            if (surah) startSurahTest(surah);
        }

        if (location.state?.from === 'strength' && location.state?.data) {
            setStrengthData(location.state.data);
            setView('strength');
            // Clear the state to prevent re-triggering
            navigate(location.pathname, { replace: true });
        }
    }, [surahList, searchParams, location.state]);

    // --- Core Logic ---

    const startSurahTest = async (surah, fromAyah = 1, revealCurrent = false, matchedText = "") => {
        setLoading(true);
        setSelectedSurah(surah);
        startDetectedRef.current = true; // Mark as detected/started
        if (setBottomNavVisible) setBottomNavVisible(false); // Hide Bottom Nav during test
        
        // --- CRITICAL RESET FOR NEW TEST ---
        setCurrentIndex(0);
        setCorrectCount(0);
        setMajorMistakes(0);
        setMinorMistakes(0);
        setIsCompleted(false);
        setIsPaused(false);
        setStartTime(Date.now());
        setEndTime(null);
        
        // Reset Fluency
        setFluencyScore(100);
        setPauseCount({ short: 0, long: 0 });
        setFlowStatus("smooth");
        setLastSpeechTime(null);
        setAnalytics(null);
        setHesitationHint("");
        setPronunciationIssues([]);
        setCurrentPronunciationIssue(null);
        
        // Clear all speech-related refs to avoid stale data from detection phase
        processedTranscriptRef.current = "";
        lastProcessedTranscriptRef.current = "";
        lastMistakeIndexRef.current = -1;
        lastMistakeTimeRef.current = 0;
        lastMatchedTranscriptWordIndexRef.current = -1; 
        setLiveTranscript("");
        
        try {
            const res = await axios.get(`${API_URL}/api/quran/surah/${surah.id}`);
            const structuredWords = res.data.ayahs.flatMap(ayah => 
                ayah.text_ar.trim().split(/\s+/).map((word, index) => ({
                    id: `${ayah.ayah_number}-${index}`,
                    text: word,
                    status: "pending",
                    ayahNumber: Number(ayah.ayah_number)
                }))
            );
            
            // Map global indices for easier tracking
            const wordsWithIndices = structuredWords.map((w, i) => ({ ...w, globalIndex: i }));
            
            let finalStartIndex = 0;
            let finalWords = wordsWithIndices;

            // --- RESUME LOGIC (RESTORE PREVIOUS PROGRESS) ---
            if (fromAyah > 1 && !matchedText) {
                const targetAyah = Number(fromAyah);
                const startIndex = wordsWithIndices.findIndex(w => w.ayahNumber === targetAyah);
                finalStartIndex = startIndex >= 0 ? startIndex : 0;

                finalWords = wordsWithIndices.map((w, i) => {
                    if (i < finalStartIndex) {
                        return { ...w, status: 'skipped' };
                    }
                    return w;
                });
                
                // --- RESET SESSION STATS ON CLEAN RESUME ---
                setMajorMistakes(0);
                setMinorMistakes(0);
                setCorrectCount(0);
            }

            if (matchedText) {
                const normalizedMatched = normalizeArabic(matchedText);
                const matchedWords = normalizedMatched.split(' ');
                
                // Find where the matchedText starts in the surah, starting from fromAyah
                const ayahStartIndex = wordsWithIndices.findIndex(w => w.ayahNumber === Number(fromAyah));
                let matchPos = -1;

                if (ayahStartIndex !== -1) {
                    // Look for the sequence of words
                    for (let i = ayahStartIndex; i < wordsWithIndices.length - matchedWords.length + 1; i++) {
                        let sequenceMatch = true;
                        for (let j = 0; j < matchedWords.length; j++) {
                            if (normalizeArabic(wordsWithIndices[i + j].text) !== matchedWords[j]) {
                                sequenceMatch = false;
                                break;
                            }
                        }
                        if (sequenceMatch) {
                            matchPos = i;
                            break;
                        }
                    }
                }

                if (matchPos !== -1) {
                    // Mark matched words as correct
                    finalWords = wordsWithIndices.map((w, i) => {
                        if (i >= matchPos && i < matchPos + matchedWords.length) {
                            return { ...w, status: 'correct' };
                        }
                        if (i < matchPos) {
                            return { ...w, status: 'skipped' };
                        }
                        return w;
                    });
                    finalStartIndex = matchPos + matchedWords.length;
                    setCorrectCount(matchedWords.length);
                } else {
                    const targetAyah = Number(fromAyah);
                    const startIndex = wordsWithIndices.findIndex(w => w.ayahNumber === targetAyah);
                    finalStartIndex = startIndex >= 0 ? startIndex : 0;
                }
            } else {
                const targetAyah = Number(fromAyah);
                const startIndex = wordsWithIndices.findIndex(w => w.ayahNumber === targetAyah);
                finalStartIndex = startIndex >= 0 ? startIndex : 0;
            }
            
            setWords(finalWords);
            wordsRef.current = finalWords;
            setCurrentIndex(finalStartIndex);
            currentIndexRef.current = finalStartIndex;

            setView('test');
            viewRef.current = 'test'; // Force immediate update to bypass useEffect delay
            setLoading(false);
            
            // --- REMOVED AUTO-START FOR PRIVACY ---
            // Microphone no longer starts automatically. 
            // User must click the Mic button to begin reciting.
            
        } catch (err) {
            console.error("Load surah error:", err);
            setError("Failed to load surah.");
            setLoading(false);
        }
    };

    const saveRecitationSession = async (finalAccuracy, finalFluency) => {
        if (!user || !selectedSurah) return;
        
        const effectiveEndTime = endTime || Date.now();
        const durationSeconds = startTime ? Math.max(1, Math.round((effectiveEndTime - startTime) / 1000)) : 0;
        const wordsPerMinute = durationSeconds > 0 ? Math.round((correctCount / durationSeconds) * 60) : 0;
        
        try {
            await axios.post(`${API_URL}/api/recitation-sessions`, {
                user_id: user.id,
                surah_id: selectedSurah.id,
                accuracy: finalAccuracy,
                fluency_score: finalFluency,
                mistake_count: majorMistakes + minorMistakes,
                pause_count: pauseCount.short + pauseCount.long,
                duration_seconds: durationSeconds,
                words_per_minute: wordsPerMinute,
                ayah_range: `${words[0]?.ayahNumber}-${words[words.length-1]?.ayahNumber}`,
                pronunciation_issues: pronunciationIssues // Store letter-level errors
            }, { headers: { Authorization: `Bearer ${session?.access_token}` } });
        } catch (err) {
            console.error("Save session error:", err);
        }
    };

    const handleSpeech = async (transcript) => {
        if (!transcript || transcript === lastProcessedTranscriptRef.current) return;
        setLiveTranscript(transcript);
        lastProcessedTranscriptRef.current = transcript;

        const now = Date.now();
        const timeSinceLastSpeech = lastSpeechTime ? (now - lastSpeechTime) / 1000 : 0;
        setLastSpeechTime(now);

        // --- Fluency Analysis ---
        if (viewRef.current === 'test' && startDetectedRef.current && !isPaused && !isCompleted) {
            if (timeSinceLastSpeech > 3.0) {
                // Major break
                setPauseCount(prev => ({ ...prev, long: prev.long + 1 }));
                setFluencyScore(prev => Math.max(0, prev - 4));
                setHesitationHint("Take your time...");
                setTimeout(() => setHesitationHint(""), 2000);
            } else if (timeSinceLastSpeech > 1.5) {
                // Hesitation
                setPauseCount(prev => ({ ...prev, short: prev.short + 1 }));
                setFluencyScore(prev => Math.max(0, prev - 2));
                setHesitationHint("Continue...");
                setTimeout(() => setHesitationHint(""), 2000);
            }
        }

        // Use Ref values to avoid stale closures
        const currentView = viewRef.current;
        const currentVisibilityMode = visibilityModeRef.current;
        const currentStrictness = strictnessRef.current;
        const currentTajweedMode = tajweedModeRef.current;

        // --- STEP 1: Smart Detection Lock ---
        if (currentView === 'menu' && !startDetectedRef.current && !isDetecting) {
            // Ignore the first 1 second of speech to allow the user to settle
            if (micStartTimeRef.current && Date.now() - micStartTimeRef.current < 1000) return;

            clearTimeout(detectTimerRef.current);
            detectTimerRef.current = setTimeout(async () => {
                const cleanedTranscript = removePreliminaries(transcript);
                const transcriptWords = cleanedTranscript.split(/\s+/).filter(s => s.trim());
                if (transcriptWords.length < 1) return; 
                
                setIsDetecting(true);
                try {
                    // Send a larger window (last 12 words) for the new multi-window backend engine
                    const phraseToDetect = transcriptWords.slice(-12).join(" ");
                    const detectRes = await axios.post(`${API_URL}/api/quran/detect`, { phrase: phraseToDetect });
                    
                    if (detectRes.data && detectRes.data.detected) {
                        const { surah: surahId, ayah, confidence, matchedText, isAmbiguous, possibleSurahs } = detectRes.data;
                        
                        if (isAmbiguous) {
                            setAmbiguousSurahs(possibleSurahs || []);
                            setDetectionConfidence(0.3);
                            setDetectedSurahName("");
                            return;
                        }

                        setAmbiguousSurahs([]);
                        const cappedConfidence = Math.min(1.0, confidence);
                        setDetectionConfidence(cappedConfidence);
                        
                        const surah = surahListRef.current.find(s => s.id === surahId);
                        if (surah) {
                            setDetectedSurahName(surah.transliteration);
                            setDetectedAyahNum(ayah);
                            
                            // Auto-start threshold: 0.50 is now safe with the cube-weighted scoring
                            if (cappedConfidence >= 0.50) {
                                startDetectedRef.current = true;
                                setShowSuccessRipple(true);
                                recognitionRef.current?.stop(); 
                                setTimeout(async () => {
                                    setLiveTranscript("");
                                    setDetectionConfidence(0);
                                    setShowSuccessRipple(false);
                                    await startSurahTest(surah, ayah, true, matchedText);
                                }, 600);
                            }
                        }
                    } else {
                        setAmbiguousSurahs([]);
                    }
                } catch (e) {
                    console.error("Detection error:", e);
                } finally {
                    setIsDetecting(false);
                }
            }, 200); // Ultra-fast 200ms debounce for "Instant" feel
            return;
        }

        // --- STEP 2: Recitation Tracking Engine (REINFORCED) ---
        if (currentView === 'test' && startDetectedRef.current) {
            const allSpokenWords = transcript.split(/\s+/).filter(s => s.trim());
            const currentWords = wordsRef.current;
            let cIndex = currentIndexRef.current;
            
            if (cIndex >= currentWords.length) return;

            // --- TRACKING: Process all new words since last match ---
            // Only process words that are likely to be "stable"
            const startIndexInTranscript = lastMatchedTranscriptWordIndexRef.current + 1;
            if (startIndexInTranscript >= allSpokenWords.length) return;

            // Debug: Optional logging for development
            // console.log("Processing words:", allSpokenWords.slice(startIndexInTranscript));

            let matchFoundInThisCall = false;

            for (let i = startIndexInTranscript; i < allSpokenWords.length; i++) {
                const globalTranscriptIndex = i;
                const spoken = allSpokenWords[i];
                const normalizedSpoken = normalizeArabic(spoken);
                if (!normalizedSpoken || normalizedSpoken.length < 2) continue;

                // --- SEARCH WINDOW (Sticky Logic): Look ahead for a match ---
                let bestMatchIdx = -1;
                let bestMatchScore = 0;
                let bestMatchSimilarity = 0; 

                // --- SEARCH WINDOW: Tightened for better tracking ---
                for (let qOffset = 0; qOffset < 6; qOffset++) {
                    const targetIdx = cIndex + qOffset;
                    if (targetIdx >= currentWords.length) break;

                    const targetWord = currentWords[targetIdx];
                    const normalizedTarget = normalizeArabic(targetWord.text);
                    const similarity = calculatePhoneticSimilarity(normalizedSpoken, normalizedTarget);

                    // High proximity bonus for the next expected word
                    const distancePenalty = qOffset * 0.15; 
                    const currentScore = similarity - distancePenalty;

                    // STRICT threshold for jumping ahead (0.80), lenient for next word (0.55)
                    const minThreshold = qOffset === 0 ? 0.55 : 0.80;

                    if (currentScore > bestMatchScore && similarity >= minThreshold) {
                        // VALIDATION: If jumping more than 2 words, check if the NEXT spoken word also matches
                        if (qOffset > 2 && i + 1 < allSpokenWords.length) {
                            const nextSpoken = normalizeArabic(allSpokenWords[i + 1]);
                            const nextTarget = normalizeArabic(currentWords[targetIdx + 1]?.text || "");
                            if (calculatePhoneticSimilarity(nextSpoken, nextTarget) < 0.60) {
                                continue; // Reject the jump, it's likely a false positive
                            }
                        }

                        bestMatchScore = currentScore;
                        bestMatchSimilarity = similarity;
                        bestMatchIdx = targetIdx;
                    }
                    
                    if (similarity === 1.0 && qOffset === 0) break;
                }

                // --- Match Threshold ---
                if (bestMatchIdx !== -1) {
                    matchFoundInThisCall = true;
                    lastMistakeIndexRef.current = -1; // Reset strike buffer on match
                    
                    // Mark Tajweed issues if similarity is not perfect
                    if (bestMatchSimilarity < 0.90) {
                        const targetWord = currentWords[bestMatchIdx];
                        const tajIssue = detectTajweedIssue(normalizedSpoken, normalizeArabic(targetWord.text));
                        if (tajIssue) {
                            setPronunciationIssues(prev => [...prev, { ...tajIssue, word: targetWord.text, index: bestMatchIdx }]);
                            setCurrentPronunciationIssue(tajIssue);
                            setTimeout(() => setCurrentPronunciationIssue(null), 3000);
                        }
                    }

                    // --- JUMP / SKIP HANDLING ---
                    const statusUpdates = {};
                    for (let j = currentIndexRef.current; j <= bestMatchIdx; j++) {
                        statusUpdates[j] = (j === bestMatchIdx) ? "correct" : "skipped";
                    }

                    const advanceAmount = (bestMatchIdx - currentIndexRef.current) + 1;
                    setCorrectCount(prev => prev + advanceAmount);
                    
                    cIndex = bestMatchIdx + 1;
                    setCurrentIndex(cIndex);
                    currentIndexRef.current = cIndex;

                    // Boost Momentum on correct match
                    setStreakCount(prev => prev + 1);
                    setMomentum({ 
                        text: "On Fire!", 
                        icon: <Flame className="w-3 h-3 animate-bounce" />, 
                        color: "text-orange-400" 
                    });

                    // Ayah Completion Feedback
                    if (bestMatchIdx > 0 && currentWords[bestMatchIdx].ayahNumber !== currentWords[bestMatchIdx - 1].ayahNumber) {
                        const feedbacks = ["Masha'Allah", "Great recitation", "Excellent", "Keep going"];
                        setFeedback(feedbacks[Math.floor(Math.random() * feedbacks.length)]);
                        setTimeout(() => setFeedback(""), 2000);

                        // Auto-save progress at the end of each Ayah
                        if (user && selectedSurah) {
                            axios.post(`${API_URL}/api/bookmarks`, {
                                user_id: user.id,
                                surah_id: selectedSurah.id,
                                ayah_number: currentWords[bestMatchIdx].ayahNumber + 1, // Save the NEXT ayah to start from
                                juz_number: selectedSurah.juz || 1,
                                type: 'session'
                            }, { headers: { Authorization: `Bearer ${session?.access_token}` } }).catch(() => {});
                        }
                    }
                    
                    setWords(prev => prev.map((w, idx) => statusUpdates[idx] ? { ...w, status: statusUpdates[idx] } : w));
                    lastMatchedTranscriptWordIndexRef.current = globalTranscriptIndex;

                    // Completion Check
                    if (cIndex >= currentWords.length) {
                        const finalAccuracy = getAccuracyValue();
                        const finalFluency = fluencyScore;
                        setIsCompleted(true);
                        setEndTime(Date.now());
                        setShowModal(true);
                        setIsListening(false);
                        recognitionRef.current?.stop();
                        saveRecitationSession(finalAccuracy, finalFluency);
                        return;
                    }
                }
            }

            // --- IMPROVED MISTAKE LOGIC (Catch-up mechanism with strike buffer) ---
                    // Increased COOLDOWN (5s) and length requirement (3 chars)
                    if (latestSpoken.length >= 3 && now - lastMistakeTimeRef.current > 5000) {
                        const targetWord = currentWords[cIndex];
                        if (targetWord) {
                            const normalizedTarget = normalizeArabic(targetWord.text);
                            const sim = calculatePhoneticSimilarity(normalizeArabic(latestSpoken), normalizedTarget);
                            
                            // Only mark as mistake if it's definitely NOT the right word
                            if (sim < 0.35) {
                                setMajorMistakes(prev => prev + 1);
                                setLastMistakeTime(now);
                                lastMistakeTimeRef.current = now;
                                setFeedback("Keep focused...");
                                setTimeout(() => setFeedback(""), 2000);
                            }
                        }
                    }
                        // Check if user is reciting something MUCH further ahead (Catch-up)
                        let foundFurtherAhead = false;
                        const catchUpWindow = 40; // Search ahead 40 words

                        for (let qOffset = 12; qOffset < catchUpWindow; qOffset++) {
                            const targetIdx = cIndex + qOffset;
                            if (targetIdx >= currentWords.length) break;

                            const targetWord = currentWords[targetIdx];
                            // REQUIRE VERY HIGH CONFIDENCE FOR AUTOMATIC JUMP (0.90+)
                            if (calculatePhoneticSimilarity(normalizeArabic(latestSpoken), normalizeArabic(targetWord.text)) >= 0.90) {
                                // Found a strong match further ahead! Let's jump.
                                lastMistakeTimeRef.current = now;
                                setMajorMistakes(m => m + 1); // Still count as a skip/mistake
                                
                                const statusUpdates = {};
                                for (let j = currentIndexRef.current; j <= targetIdx; j++) {
                                    statusUpdates[j] = (j === targetIdx) ? "correct" : "skipped";
                                }
                                setWords(prev => prev.map((w, idx) => statusUpdates[idx] ? { ...w, status: statusUpdates[idx] } : w));
                                 
                                 cIndex = targetIdx + 1;
                                 setCurrentIndex(cIndex);
                                 currentIndexRef.current = cIndex;
                                 lastMatchedTranscriptWordIndexRef.current = latestSpokenIndex;
                                 foundFurtherAhead = true;

                                 // Auto-save session progress on jump
                                 if (user && selectedSurah) {
                                     axios.post(`${API_URL}/api/bookmarks`, {
                                         user_id: user.id,
                                         surah_id: selectedSurah.id,
                                         ayah_number: currentWords[targetIdx]?.ayahNumber || 1,
                                         juz_number: selectedSurah.juz || 1,
                                         type: 'session'
                                     }, { headers: { Authorization: `Bearer ${session?.access_token}` } }).catch(() => {});
                                 }
                                 break;
                            }
                        }

                        if (!foundFurtherAhead) {
                            // Strike System: Don't penalize on the first "miss" to account for STT noise
                            if (lastMistakeIndexRef.current !== latestSpokenIndex) {
                                lastMistakeIndexRef.current = latestSpokenIndex;
                                lastMistakeTimeRef.current = now;
                                return; // Grace period: Skip penalty this time
                            }

                            lastMistakeTimeRef.current = now;
                            setMajorMistakes(m => m + 1);
                            setFluencyScore(prev => Math.max(0, prev - 3)); // Reduced penalty
                            setMistakeFlash(true);
                            
                            // SMOOTH REWIND: Only rewind if they've made multiple mistakes, 
                            // otherwise just stay at the current word and wait for them to catch up.
                            if (majorMistakes > 2) {
                                const rewindIndex = Math.max(0, currentIndexRef.current - 1);
                                setCurrentIndex(rewindIndex);
                                currentIndexRef.current = rewindIndex;
                            }
                            
                            setTimeout(() => setMistakeFlash(false), 400);

                            // Auto-save session progress
                            if (user && selectedSurah) {
                                axios.post(`${API_URL}/api/bookmarks`, {
                                    user_id: user.id,
                                    surah_id: selectedSurah.id,
                                    ayah_number: currentWords[rewindIndex]?.ayahNumber || 1,
                                    juz_number: selectedSurah.juz || 1,
                                    type: 'session'
                                }, { headers: { Authorization: `Bearer ${session?.access_token}` } }).catch(() => {});
                            }
                        }
                    }
                }
            }
        }
    };

    const stopRecognition = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onstart = null;
                recognitionRef.current.onend = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.stop();
            } catch (e) {
                console.error("Stop error:", e);
            }
            recognitionRef.current = null;
        }
        setIsListening(false);
        isRecognitionActiveRef.current = false;
        
        // CLEAR STATE ON STOP
        setLiveTranscript("");
        lastProcessedTranscriptRef.current = "";
        lastMatchedTranscriptWordIndexRef.current = -1; // Reset transcript pointer
        setDetectedSurahName("");
        setDetectionConfidence(0);
        if (viewRef.current === 'menu') {
            startDetectedRef.current = false; // Unlock detection if we stopped while in menu
        }
    };

    const startRecognition = () => {
        if (recognitionRef.current) stopRecognition();

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // CLEAR STATE BEFORE STARTING
        setLiveTranscript("");
        lastProcessedTranscriptRef.current = "";
        setDetectedSurahName("");
        setDetectionConfidence(0);
        if (viewRef.current === 'menu') {
            startDetectedRef.current = false;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ar-SA';
        
        recognition.onstart = () => {
            setIsListening(true);
            isRecognitionActiveRef.current = true;
            micStartTimeRef.current = Date.now();
        };
        
        recognition.onend = () => {
            // Auto-restart if we're still in a state where we should be listening
            if (isRecognitionActiveRef.current && (viewRef.current === 'test' || viewRef.current === 'menu')) {
                try { recognition.start(); } catch (e) {}
            } else {
                setIsListening(false);
                isRecognitionActiveRef.current = false;
                micStartTimeRef.current = null;
            }
        };

        recognition.onerror = (event) => {
            console.error("SpeechRecognition error:", event.error);
            if (event.error === 'not-allowed') setError("Microphone access denied.");
            if (event.error === 'network') setError("Network error. Please check connection.");
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join(" ");
            
            if (handleSpeechRef.current) {
                handleSpeechRef.current(transcript);
            }
        };
        
        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.error("Start error:", e);
        }
    };

    useEffect(() => {
        // Microphone no longer auto-starts on mount for privacy.
        // User must click "Start Reciting" or select a Surah to begin.
        
        return () => {
            stopRecognition();
        };
    }, []); 

    const toggleListening = () => {
        if (isRecognitionActiveRef.current) {
            stopRecognition();
        } else {
            startRecognition();
        }
    };

    // --- Views ---

    const renderMenu = () => (
        <div className="w-full max-w-[420px] mx-auto pt-4 px-4 pb-[90px] space-y-6">
            {/* Header with Back Button & Streak */}
            <header className="flex justify-between items-center px-1">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/')}
                        className="p-3 glass-card hover:bg-white/10 active:scale-90 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold text-white tracking-tight">{t('hifzRevision')}</h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-70">{t('mashaAllah')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full shadow-lg shadow-amber-900/10">
                    <Flame className="w-4 h-4 text-amber-500 fill-current" />
                    <span className="text-amber-500 font-black text-xs tracking-tight">{streakCount}D</span>
                </div>
            </header>

            {/* Smart Start AI - TOP & Primary CTA */}
            <div className={`relative overflow-hidden glass-card p-6 text-center transition-all duration-500 green-glow ${showSuccessRipple ? 'ring-4 ring-emerald-500/40 bg-emerald-500/20' : ''}`}>
                <div className="absolute inset-0 bg-emerald-500/5" />
                <AnimatePresence>
                    {showSuccessRipple && (
                        <motion.div 
                            initial={{ scale: 0, opacity: 0.8 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 bg-emerald-400 rounded-full z-0 pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                <div className="relative z-10 w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/20">
                    {isDetecting ? (
                        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    ) : (
                        <div className="relative">
                            {isListening && <div className="absolute inset-0 bg-red-500/40 blur-md rounded-full animate-pulse scale-150" />}
                            <Mic className={`w-7 h-7 relative z-10 ${isListening ? 'text-red-400' : 'text-emerald-400'}`} />
                        </div>
                    )}
                </div>
                
                <div className="relative z-10 space-y-1 mb-6">
                    <h4 className="text-xl font-bold text-white tracking-tight">{t('smartStartAI')}</h4>
                    <AnimatePresence mode="wait">
                        {ambiguousSurahs.length > 0 ? (
                            <motion.div
                                key="ambiguous"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="space-y-1"
                            >
                                <p className="text-[11px] text-amber-400 font-black uppercase tracking-widest leading-relaxed">
                                    Matches found in: {ambiguousSurahs.join(", ")}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium italic">{t('keepReciting')}</p>
                            </motion.div>
                        ) : (
                            <motion.p 
                                key="normal"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-[11px] text-slate-400 leading-relaxed max-w-[200px] mx-auto font-medium"
                            >
                                {t('reciteAnyAyah')}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-3">
                    <button 
                        onClick={toggleListening}
                        disabled={isDetecting || showSuccessRipple}
                        className={`w-full h-14 rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all shadow-xl active:scale-[0.98] ${showSuccessRipple ? 'bg-emerald-500 text-white' : isDetecting ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : isListening ? 'bg-red-600 text-white shadow-red-500/30 border border-red-500/30' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/30 border border-emerald-400/20'}`}
                    >
                        {showSuccessRipple ? t('jumping') : isDetecting ? t('analyzing') : isListening ? t('stopListening') : t('startReciting')}
                    </button>

                    {/* Confidence Bar */}
                    <AnimatePresence>
                        {isListening && !showSuccessRipple && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="w-full space-y-2 mt-4"
                            >
                                {detectedSurahName && (
                                    <div className="text-center">
                                        <span className="text-emerald-400 font-black tracking-[0.15em] text-[10px] uppercase">{t('match')}: SURAH {detectedSurahName}</span>
                                    </div>
                                )}
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${detectionConfidence * 100}%` }}
                                        className={`h-full transition-colors duration-300 ${detectionConfidence >= 0.60 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-500'}`}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <SelectionCard 
                    icon={LayoutGrid} 
                    title="Start by Juz" 
                    subtitle="30 JUZ EXPLORER"
                    onClick={() => setView('juz')}
                    color="emerald"
                />
                <SelectionCard 
                    icon={BookOpen} 
                    title="Start by Surah" 
                    subtitle="114 SURAHS LIST"
                    onClick={() => setView('surah')}
                    color="blue"
                />
                <SelectionCard 
                    icon={HelpCircle} 
                    title="Random Ayah Test" 
                    subtitle="MEMORY CHALLENGE"
                    onClick={() => {
                        const randomSurah = surahList[Math.floor(Math.random() * surahList.length)];
                        startSurahTest(randomSurah, Math.floor(Math.random() * randomSurah.total_verses) + 1);
                    }}
                    color="rose"
                />
                <SelectionCard 
                    icon={Bookmark} 
                    title="Bookmarks" 
                    subtitle={`${bookmarks.length} SAVED SPOTS`}
                    onClick={() => setView('bookmarks')}
                    color="amber"
                />
                {lastSession && (
                    <SelectionCard 
                        icon={RotateCcw} 
                        title="Resume Session" 
                        subtitle={`SURAH ${surahList.find(s => s.id === lastSession.surah_id)?.transliteration.toUpperCase()}`}
                        onClick={() => startSurahTest(surahList.find(s => s.id === lastSession.surah_id), lastSession.ayah_number)}
                        color="indigo"
                    />
                )}
            </div>
            
            {/* Bottom Back Button */}
            <div className="pt-4 flex flex-col items-center">
                <button 
                  onClick={() => navigate('/')}
                  className="group flex items-center gap-2 px-8 py-4 glass-card hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Back to Home</span>
                </button>
            </div>
        </div>
    );

    const renderSurahSelection = () => (
        <div className="w-full max-w-[420px] mx-auto pt-4 px-4 pb-[90px]">
            <header className="mb-5 flex items-center gap-4">
                <button onClick={() => setView('menu')} className="p-2 bg-slate-900/50 rounded-xl text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-bold text-white">Select Surah</h2>
            </header>
            <div className="mb-5 sticky top-4 z-30">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search Surah..."
                        value={searchTerm}
                        className="w-full pl-11 pr-5 py-3.5 bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-full focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all outline-none text-sm"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-2">
                {filteredSurahs.map((surah) => (
                    <motion.button 
                        key={surah.id} 
                        whileTap={{ scale: 0.97 }}
                        onClick={() => startSurahTest(surah)} 
                        className="w-full p-4 bg-slate-900/40 hover:bg-slate-800/60 rounded-2xl transition-all flex justify-between items-center text-left border border-white/5 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                                {surah.id}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">{surah.transliteration}</h3>
                                <p className="text-[10px] text-slate-500 font-medium">{surah.total_verses} Ayahs</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-arabic text-emerald-400/80 group-hover:text-emerald-400 transition-colors">{surah.name}</span>
                            <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-white transition-colors" />
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* Bottom Back Button */}
            <div className="pt-4 flex flex-col items-center">
                <button 
                  onClick={() => navigate('/')}
                  className="group flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded-full transition-all border border-white/5 active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-semibold">Back to Home</span>
                </button>
            </div>
        </div>
    );

    const renderJuzSelection = () => (
        <div className="w-full max-w-[420px] mx-auto pt-4 px-4 pb-[90px]">
            <header className="mb-5 flex items-center gap-4">
                <button onClick={() => setView('menu')} className="p-2 bg-slate-900/50 rounded-xl text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Select Juz</h2>
            </header>
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                    <motion.button
                        key={juz}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => alert(`Juz ${juz} logic coming soon.`)}
                        className="p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 group transition-all h-28 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold group-hover:bg-emerald-500/20 transition-colors text-sm border border-emerald-500/20">
                            {juz}
                        </div>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-white uppercase tracking-widest">Juz {juz}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );

    const renderBookmarks = () => (
        <div className="w-full max-w-[420px] mx-auto pt-4 px-4 pb-[90px]">
            <header className="mb-5 flex items-center gap-4">
                <button onClick={() => setView('menu')} className="p-2 bg-slate-900/50 rounded-xl text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Bookmarks</h2>
            </header>

            {bookmarks.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-10 text-center space-y-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                        <Bookmark className="w-6 h-6 text-amber-500/50" />
                    </div>
                    <p className="text-slate-400 text-xs">No saved positions yet.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {bookmarks.map((bookmark) => {
                        const surah = surahList.find(s => s.id === bookmark.surah_id);
                        return (
                            <motion.div 
                                key={bookmark.id} 
                                whileTap={{ scale: 0.99 }}
                                className="w-full p-4 bg-slate-900/40 rounded-2xl flex justify-between items-center border border-white/5 relative group cursor-pointer"
                                onClick={() => startSurahTest(surah, bookmark.ayah_number)} 
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                                        <Bookmark className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                                            {surah?.transliteration}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-medium">Ayah {bookmark.ayah_number} • Saved {new Date(bookmark.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                await axios.delete(`${API_URL}/api/bookmarks/${bookmark.id}`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
                                                setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
                                            } catch (err) { console.error(err); }
                                        }}
                                        className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className="w-4 h-4 text-slate-700" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderStrengthSelection = () => (
        <div className="w-full max-w-[420px] mx-auto pt-4 px-4 pb-[90px]">
            <header className="mb-5 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 bg-slate-900/50 rounded-xl text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Revision Strength</h2>
            </header>
            <div className="space-y-2.5">
                {strengthData.map((item) => {
                    const surah = surahList.find(s => s.id === (item.surah_id || item.surah));
                    if (!surah) return null;
                    return (
                        <motion.button 
                            key={surah.id} 
                            whileTap={{ scale: 0.97 }}
                            onClick={() => startSurahTest(surah)} 
                            className="w-full p-4 bg-slate-900/40 hover:bg-slate-800/60 rounded-2xl flex justify-between items-center border border-white/5 group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                                    {surah.id}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base group-hover:text-emerald-500 transition-colors">{surah.transliteration}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium">Avg: {item.average_accuracy ?? item.avg_score}%</p>
                                </div>
                            </div>
                            <span className="text-xl font-arabic text-emerald-400/80 group-hover:text-emerald-400 transition-colors">{surah.name}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );

    const toggleBookmark = async () => {
        if (!user || !selectedSurah) return;
        const currentAyahNum = words[currentIndex]?.ayahNumber || 1;
        
        // Check if already bookmarked
        const existing = bookmarks.find(b => b.surah_id === selectedSurah.id && b.ayah_number === currentAyahNum);
        
        try {
            if (existing) {
                await axios.delete(`${API_URL}/api/bookmarks/${existing.id}`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
                setBookmarks(prev => prev.filter(b => b.id !== existing.id));
            } else {
                 const res = await axios.post(`${API_URL}/api/bookmarks`, {
                     user_id: user.id,
                     surah_id: selectedSurah.id,
                     ayah_number: currentAyahNum,
                     type: 'manual' // Add explicit type to satisfy backend
                 }, { headers: { Authorization: `Bearer ${session?.access_token}` } });
                 setBookmarks(prev => [...prev, res.data]);
             }
        } catch (err) {
            console.error("Toggle bookmark error:", err.response?.data?.error || err.message);
        }
    };

    const renderTest = () => {
        const totalWords = words.length;
        const currentAyahNum = words[currentIndex]?.ayahNumber || 1;
        const totalAyahs = selectedSurah?.total_verses || 0;
        const progressPercent = totalWords > 0 ? (currentIndex / totalWords) * 100 : 0;
        const totalMistakes = majorMistakes + minorMistakes;
        const accuracy = getAccuracyValue();
        const effectiveEndTime = endTime || (isCompleted && startTime ? Date.now() : null);
        const durationSeconds = startTime && effectiveEndTime ? Math.max(1, Math.round((effectiveEndTime - startTime) / 1000)) : 0;
        const wordsPerMinute = durationSeconds > 0 ? Math.round((correctCount / durationSeconds) * 60) : 0;

        const ayahs = {};
        words.forEach((word, index) => {
            if (!ayahs[word.ayahNumber]) ayahs[word.ayahNumber] = [];
            ayahs[word.ayahNumber].push({ ...word, globalIndex: index });
        });
        const memoizedAyahs = Object.keys(ayahs).map(ayahNum => ({ id: Number(ayahNum), words: ayahs[ayahNum] }));

        return (
            <div className="min-h-screen flex flex-col relative overflow-x-hidden font-sans">
                {/* Thin Progress Bar at Top */}
                <div className="fixed top-0 left-0 right-0 h-1 bg-slate-900 z-[70]">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                </div>

                <header className="fixed top-0 inset-x-0 z-[60] bg-slate-950/90 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
                    <button onClick={() => {
                        setView('menu');
                        if (setBottomNavVisible) setBottomNavVisible(true);
                        stopRecognition();
                        startDetectedRef.current = false;
                        setMistakeFlash(false);
                        setLiveTranscript("");
                        setDetectedSurahName("");
                        setDetectionConfidence(0);
                        startRecognition(); // Restart for menu detection
                    }} className="p-3 glass-card hover:bg-white/10 active:scale-90 transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    
                    <div className="text-center relative">
                        {/* Real-time Fluency Indicator */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap">
                            <div className={`w-1.5 h-1.5 rounded-full ${flowStatus === 'smooth' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : flowStatus === 'focus' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest ${flowStatus === 'smooth' ? 'text-emerald-400' : flowStatus === 'focus' ? 'text-amber-400' : 'text-red-400'}`}>
                                {flowStatus === 'smooth' ? 'Smooth' : flowStatus === 'focus' ? 'Needs Focus' : 'Struggling'}
                            </span>
                        </div>

                        <AnimatePresence>
                            {feedback && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: -20 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-x-0 -top-6 whitespace-nowrap text-emerald-400 font-bold text-xs"
                                >
                                    {feedback}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <h1 className="text-lg font-bold text-white tracking-tight leading-none">{selectedSurah.transliteration}</h1>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                            Ayah {currentAyahNum} / {totalAyahs}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end px-2">
                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Confidence</span>
                            <span className="text-xs font-black text-white">{fluencyScore}%</span>
                        </div>
                        <button onClick={() => setShowSettings(!showSettings)} className="p-3 glass-card hover:bg-white/10 active:scale-90 transition-all">
                            <Settings className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </header>

                <main className="flex-grow pt-24 pb-40 px-4 max-w-lg mx-auto w-full">
                    <div className="flex flex-wrap justify-center content-start gap-x-2 gap-y-6 text-center leading-[3.2]" dir="rtl">
                        {memoizedAyahs.map((ayah) => (
                            <React.Fragment key={ayah.id}>
                                {ayah.words.map((word) => (
                                    <div key={word.id} ref={el => { if (word.globalIndex === currentIndex) ayahRefs.current[ayah.id] = el; }}>
                                        <WordItem 
                                            word={word} 
                                            currentIndex={currentIndex} 
                                            visibilityMode={visibilityMode} 
                                            isFlashing={mistakeFlash && word.globalIndex === currentIndex}
                                            showHint={showHint}
                                            fontSize={fontSize}
                                        />
                                    </div>
                                ))}
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-emerald-500/30 text-emerald-500/60 font-arabic text-xs mx-1 translate-y-2">
                                    {ayah.id}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </main>

                {/* Recitation Control Bar */}
                <div className="fixed bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-center z-[60] px-4 pointer-events-none pb-4">
                    <div className="w-full max-w-[460px] flex items-center justify-between pointer-events-auto bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/10 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
                            <button 
                                onClick={() => setFontSize(prev => Math.max(32, prev - 4))}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                            >
                                <span className="text-sm font-bold">A-</span>
                            </button>
                            <div className="px-1 text-[8px] font-black text-slate-500 uppercase tracking-tighter w-8 text-center">{fontSize}</div>
                            <button 
                                onClick={() => setFontSize(prev => Math.min(120, prev + 4))}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                            >
                                <span className="text-sm font-bold">A+</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setRecitationSpeed(s => s === 1.5 ? 1.0 : s + 0.25 > 1.5 ? 0.75 : s + 0.25)}
                                className="w-10 h-10 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                                <FastForward className="w-4 h-4" />
                                <span className="text-[8px] font-bold mt-0.5">{recitationSpeed}x</span>
                            </button>

                            <motion.button 
                                whileTap={{ scale: 0.9 }} 
                                onClick={toggleListening} 
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${isListening ? 'bg-red-500 shadow-red-500/40' : 'bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-500'}`}
                            >
                                {isListening ? (
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping scale-150" />
                                        <Pause className="w-5 h-5 text-white fill-current" />
                                    </div>
                                ) : (
                                    <Mic className="w-6 h-6 text-white" />
                                )}
                            </motion.button>

                            <button 
                                onClick={() => setIsPaused(!isPaused)}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors"
                            >
                                {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="w-12 h-1 rounded-full bg-white/5 sm:hidden" /> {/* Visual spacing */}
                    </div>
                </div>

                {/* Session Analytics Dashboard */}
                <AnimatePresence>
                    {isCompleted && showModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-2xl flex items-center justify-center z-[100] p-4 overflow-y-auto">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-[400px] bg-slate-900 rounded-[32px] shadow-2xl border border-white/10 p-6 sm:p-8 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                        <Flame className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Recitation Analysis</h2>
                                    <p className="text-slate-400 text-sm font-medium">Masha'Allah, great progress today!</p>
                                </div>

                                {/* Performance Breakdown */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 space-y-1">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Accuracy</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-white">{accuracy}%</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 space-y-1">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fluency</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-emerald-400">{flowStatus.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-800/40 p-5 rounded-[24px] border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="text-xs text-slate-300 font-bold">Mistakes</span>
                                        </div>
                                        <span className="text-xs font-black text-white">{majorMistakes} Major · {minorMistakes} Minor</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span className="text-xs text-slate-300 font-bold">Pauses</span>
                                        </div>
                                        <span className="text-xs font-black text-white">{pauseCount.short} Short · {pauseCount.long} Long</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-xs text-slate-300 font-bold">Speed</span>
                                        </div>
                                        <span className="text-xs font-black text-white">{wordsPerMinute} Words / Min</span>
                                    </div>
                                    {pronunciationIssues.length > 0 && (
                                        <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                <span className="text-xs text-slate-300 font-bold">Pronunciation</span>
                                            </div>
                                            <span className="text-xs font-black text-white">{pronunciationIssues.length} Issues Found</span>
                                        </div>
                                    )}
                                </div>

                                {/* Improvement Insight */}
                                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex gap-3">
                                    <Info className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                    <p className="text-xs text-emerald-100/80 leading-relaxed font-medium">
                                        {accuracy >= 90 && flowStatus === 'smooth' && pronunciationIssues.length === 0
                                            ? "Excellent! Your Hifz and Tajweed are very strong here."
                                            : pronunciationIssues.length > 5
                                            ? "Focus on your letter pronunciation (Makharij). Consider enabling Strict Tajweed Mode for practice."
                                            : flowStatus === 'struggling'
                                            ? "Focus on improving your fluency in this Surah. Try reciting it slowly 5 times."
                                            : "A few minor hesitations detected. Revise the connection between these ayahs."}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <button onClick={() => { 
                                        setView('menu'); 
                                        if (setBottomNavVisible) setBottomNavVisible(true);
                                        setWords([]); 
                                        setIsCompleted(false); 
                                        setShowModal(false); 
                                        startDetectedRef.current = false;
                                        setLiveTranscript("");
                                        setDetectedSurahName("");
                                        setDetectionConfidence(0);
                                        startRecognition(); // Reset recognition for the menu
                                    }} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 active:scale-[0.98]">
                                        Finish Session
                                    </button>
                                    <button onClick={() => { 
                                        setIsCompleted(false);
                                        setShowModal(false);
                                        startSurahTest(selectedSurah); 
                                    }} className="w-full bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl hover:bg-slate-700 transition-all active:scale-[0.98]">
                                        Try Again
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settings Overlay */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-6"
                        >
                            <motion.div 
                                initial={{ scale: 0.9, y: 20 }} 
                                animate={{ scale: 1, y: 0 }} 
                                className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6"
                            >
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-white">Test Settings</h2>
                                    <button onClick={() => setShowSettings(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Tajweed Mode Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tajweed Mode</h4>
                                        <div className="p-1 bg-slate-800 rounded-lg flex items-center gap-1">
                                            {['OFF', 'NORMAL', 'STRICT'].map((mode) => (
                                                <button 
                                                    key={mode}
                                                    onClick={() => setTajweedMode(mode)}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${tajweedMode === mode ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        {tajweedMode === 'OFF' && "No pronunciation checks. Focus only on memorization."}
                                        {tajweedMode === 'NORMAL' && "Detects major mistakes. Ignores minor phonetic differences."}
                                        {tajweedMode === 'STRICT' && "Strict letter-level matching. High accuracy required."}
                                    </p>
                                </div>

                                {/* Visibility Mode Toggle */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">View Mode</h4>
                                    <div className="p-1 bg-slate-800 rounded-lg flex items-center gap-1">
                                        <button 
                                            onClick={() => setVisibilityMode('hidden')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${visibilityMode === 'hidden' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Test
                                        </button>
                                        <button 
                                            onClick={() => setVisibilityMode('visible')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${visibilityMode === 'visible' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Mushaf
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setShowSettings(false)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all"
                                >
                                    Apply Settings
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
            <SpecialLoader message="Preparing Test..." />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col relative overflow-x-hidden font-sans">
            {view === 'menu' && renderMenu()}
            {view === 'surah' && renderSurahSelection()}
            {view === 'juz' && renderJuzSelection()}
            {view === 'bookmarks' && renderBookmarks()}
            {view === 'strength' && renderStrengthSelection()}
            {view === 'test' && renderTest()}

            {/* Auto-Resume Modal */}
            <AnimatePresence>
                {showResumeModal && resumeData && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-6"
                        >
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                <RotateCcw className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-white">Resume Session?</h2>
                                <p className="text-slate-400 text-sm">
                                    Continue from <span className="text-emerald-400 font-bold">{surahList.find(s => s.id === resumeData.surah_id)?.transliteration}</span> at Ayah {resumeData.ayah_number}?
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => {
                                        startSurahTest(surahList.find(s => s.id === resumeData.surah_id), resumeData.ayah_number);
                                        setShowResumeModal(false);
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                                >
                                    Continue Revision
                                </button>
                                <button 
                                    onClick={() => setShowResumeModal(false)}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-2xl active:scale-95 transition-all"
                                >
                                    Start Fresh
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HifzTestMode;
