import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Users, BookOpen, Activity, Play, Pause, ChevronRight, User, AlertCircle, Calendar, CheckCircle, UserX, Mic, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SpecialLoader from '../components/SpecialLoader';

const API_URL = import.meta.env.VITE_API_URL;

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // State
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Audio State
  const [playingUrl, setPlayingUrl] = useState(null);
  const audioRef = useRef(null);

  // Fetch Students on Mount
  useEffect(() => {
    if (!user) return;

    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/teacher/students/${user.id}`);
        setStudents(response.data);
        if (response.data.length > 0) {
            // Optional: Automatically select first student
            // handleStudentClick(response.data[0]);
        }
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students list.");
      } finally {
    fetchStudents();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <SpecialLoader message="Loading Students..." />
      </div>
    );
  }

  // Handle Student Selection
  const handleStudentClick = async (student) => {
    setSelectedStudent(student);
    setDataLoading(true);
    setStudentData(null); // Reset previous data
    
    try {
      const response = await axios.get(`${API_URL}/api/teacher/student/${student.id}/summary`);
      setStudentData(response.data);
    } catch (err) {
      console.error("Error fetching student details:", err);
      // We don't set global error here to keep the list usable
    } finally {
      setDataLoading(false);
    }
  };

  // Audio Playback Logic
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

  return (
    <div className="min-h-screen w-full font-sans flex flex-col md:flex-row md:overflow-hidden">
      
      {/* LEFT PANEL - Student List */}
      <div className="w-full md:w-1/4 bg-slate-900/50 backdrop-blur-md border-b md:border-b-0 md:border-r border-white/10 flex flex-col h-80 md:h-auto shrink-0">
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-3 glass-card hover:bg-white/10 active:scale-90 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3 text-gold-accent mb-1">
              <Users className="w-6 h-6" />
              <h1 className="text-xl font-bold tracking-wide">My Students</h1>
            </div>
            <p className="text-xs text-slate-400">Select a student to view progress</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <UserX className="w-12 h-12 mb-3 opacity-50" />
                <p>No students assigned.</p>
            </div>
          ) : (
            students.map((student) => (
              <motion.button
                key={student.id}
                onClick={() => handleStudentClick(student)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                  selectedStudent?.id === student.id 
                    ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-900/20' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${selectedStudent?.id === student.id ? 'bg-emerald-500/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{student.name}</h3>
                    <p className={`text-xs ${selectedStudent?.id === student.id ? 'text-emerald-100' : 'text-slate-400'}`}>{student.email}</p>
                  </div>
                </div>
                {selectedStudent?.id === student.id && <ChevronRight className="w-4 h-4 text-emerald-200" />}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Student Summary */}
      <div className="flex-1 flex flex-col md:overflow-y-auto bg-slate-900/30 overflow-y-visible">
        {selectedStudent ? (
          <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 md:space-y-8">
            
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end justify-between"
            >
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">{selectedStudent.name}</h2>
                <p className="text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Student Profile
                </p>
              </div>
            </motion.div>

            {dataLoading ? (
               <div className="flex items-center justify-center h-64">
                 <SpecialLoader message="Fetching Details..." />
               </div>
            ) : studentData ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {/* 1. Streak Card */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 backdrop-blur-md border border-orange-500/20 p-6 rounded-2xl flex flex-col items-center justify-center text-center col-span-1"
                >
                    <div className="p-3 bg-orange-500/20 rounded-full mb-3 text-orange-400">
                        <Activity className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-orange-200 mb-1">Current Streak</h3>
                    <p className="text-4xl font-bold text-white">{studentData.streak} <span className="text-base font-normal text-slate-400">days</span></p>
                </motion.div>

                {/* 2. Weak Surahs */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl col-span-1 md:col-span-2"
                >
                    <div className="flex items-center gap-2 mb-4 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">Focus Areas (Weak Surahs)</h3>
                    </div>
                    
                    {studentData.weak_surahs.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {studentData.weak_surahs.map((surah) => (
                                <div key={surah.surah} className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                                    <span className="font-medium text-red-200">Surah {surah.surah}</span>
                                    <span className="text-xs font-bold bg-red-500/20 px-2 py-0.5 rounded text-red-300">{surah.avg_score}%</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                            <div className="p-2 bg-emerald-500/20 rounded-full mb-2 text-emerald-400">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <p className="text-emerald-200 font-medium">All Surahs Strong</p>
                            <p className="text-slate-400 text-sm">This student has excellent command over their revision.</p>
                        </div>
                    )}
                </motion.div>

                {/* 3. Recent Recitations (Full Width) */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl col-span-1 md:col-span-3"
                >
                    <div className="flex items-center gap-2 mb-6 text-emerald-400">
                        <Calendar className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">Recent Recitations</h3>
                    </div>

                    {studentData.recent_recitations.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-white/5">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-white/5 text-slate-400 font-medium">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Surah</th>
                                        <th className="p-4">Score</th>
                                        <th className="p-4 text-right">Playback</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {studentData.recent_recitations.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                            </td>
                                            <td className="p-4 font-medium text-white">Surah {log.surah_number}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                    log.fluency_score >= 90 ? 'bg-emerald-500/20 text-emerald-300' :
                                                    log.fluency_score >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                                                    'bg-red-500/20 text-red-300'
                                                }`}>
                                                    {log.fluency_score}%
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {log.audio_url ? (
                                                    <button
                                                        onClick={() => handlePlayAudio(log.audio_url)}
                                                        className={`p-2 rounded-full transition-all ${
                                                            playingUrl === `${API_URL}${log.audio_url}` 
                                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                                                            : 'bg-white/10 hover:bg-emerald-500 hover:text-white'
                                                        }`}
                                                    >
                                                        {playingUrl === `${API_URL}${log.audio_url}` ? (
                                                            <Pause className="w-4 h-4 fill-current" />
                                                        ) : (
                                                            <Play className="w-4 h-4 fill-current" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-600 text-xs">No Audio</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-white/5 rounded-xl border border-white/5">
                            <div className="p-3 bg-white/10 rounded-full mb-3 text-slate-500">
                                <Mic className="w-8 h-8" />
                            </div>
                            <p className="text-slate-300 font-medium">No Recitations Yet</p>
                            <p className="text-slate-500 text-sm">Student hasn't recorded any sessions recently.</p>
                        </div>
                    )}
                </motion.div>

              </motion.div>
            ) : null}

          </div>
        ) : (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <div className="bg-white/5 p-6 rounded-full mb-4">
                <Users className="w-12 h-12 opacity-50" />
            </div>
            <p className="text-lg">Select a student from the sidebar</p>
            <p className="text-sm opacity-60">to view their performance summary</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
