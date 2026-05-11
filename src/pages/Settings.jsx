import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Palette, Type, ShieldCheck, AlertTriangle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme, themeNames } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ConfirmationDialog from '../components/ConfirmationDialog';

const Settings = () => {
  const navigate = useNavigate();
  const { t, language, changeLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const [scriptStyle, setScriptStyle] = useState(localStorage.getItem('scriptStyle') || 'Madani');
  const [strictness, setStrictness] = useState(localStorage.getItem('strictness') || 'Normal');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleScriptChange = (style) => {
      setScriptStyle(style);
      localStorage.setItem('scriptStyle', style);
      window.dispatchEvent(new Event('storage')); 
  };

  const handleStrictnessChange = (mode) => {
      setStrictness(mode);
      localStorage.setItem('strictness', mode);
      window.dispatchEvent(new Event('storage'));
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi (हिंदी)' },
    { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
    { code: 'ur', name: 'Urdu (اردو)' },
  ];

  const themesList = Object.keys(themeNames).map(key => ({
    key,
    name: themeNames[key]
  }));

  return (
    <div className="min-h-screen font-sans pb-32">
      <div className="max-w-md mx-auto px-4 pt-8 pb-32">
        {/* Header */}
        <header className="sticky top-0 z-[100] bg-inherit backdrop-blur-xl border-b border-white/10 px-4 h-[70px] flex items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 glass-card hover:bg-white/10 transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{t('settings')}</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-70">{t('configuration')}</p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
            {/* Theme Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Palette className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold text-white">{t('theme')}</h2>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium">{t('customizeLook')}</p>
                
                <div className="grid grid-cols-1 gap-3">
                {themesList.map((t) => (
                    <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        theme === t.key
                        ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                    >
                    <span className={`text-sm font-bold ${theme === t.key ? 'text-emerald-400' : 'text-slate-300'}`}>{t.name}</span>
                    {theme === t.key && (
                        <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    )}
                    </button>
                ))}
                </div>
              </div>
            </motion.div>

            {/* Script Style Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Type className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-white">{t('scriptStyle')}</h2>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium">{t('chooseScript')}</p>
                
                <div className="grid grid-cols-1 gap-3">
                    {['Madani', 'IndoPak'].map((style) => (
                        <button
                        key={style}
                        onClick={() => handleScriptChange(style)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            scriptStyle === style
                            ? 'bg-blue-500/20 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                        >
                        <span className={`text-sm font-bold ${scriptStyle === style ? 'text-blue-400' : 'text-slate-300'} ${style === 'IndoPak' ? 'font-[IndoPak]' : ''}`}>
                            {style === 'Madani' ? 'Madani (Uthmani)' : 'IndoPak (Nastaliq)'}
                        </span>
                        {scriptStyle === style && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        )}
                        </button>
                    ))}
                </div>
              </div>
            </motion.div>

            {/* Recitation Strictness Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-lg font-bold text-white">{t('strictness')}</h2>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium">{t('adjustStrictness')}</p>
                
                <div className="grid grid-cols-1 gap-3">
                    {['Easy', 'Normal', 'Strict'].map((mode) => (
                        <button
                        key={mode}
                        onClick={() => handleStrictnessChange(mode)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            strictness === mode
                            ? 'bg-amber-500/20 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                        >
                        <div className="text-left">
                            <span className={`text-sm font-bold block ${strictness === mode ? 'text-amber-400' : 'text-slate-300'}`}>{t(mode.toLowerCase())}</span>
                            <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">
                                {mode === 'Easy' && t('forgivingMatching')}
                                {mode === 'Normal' && t('standardAccuracy')}
                                {mode === 'Strict' && t('highPrecision')}
                            </span>
                        </div>
                        {strictness === mode && (
                            <div className="w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                        )}
                        </button>
                    ))}
                </div>
              </div>
            </motion.div>

            {/* Language Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Globe className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-bold text-white">{t('language')}</h2>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium">{t('selectLanguage')}</p>
                
                <div className="grid grid-cols-1 gap-3">
                {languages.map((lang) => (
                    <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        language === lang.code
                        ? 'bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                    >
                    <span className={`text-sm font-bold ${language === lang.code ? 'text-indigo-400' : 'text-slate-300'}`}>{lang.name}</span>
                    {language === lang.code && (
                        <div className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    )}
                    </button>
                ))}
                </div>
              </div>
            </motion.div>

            {/* Logout Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pt-4"
            >
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 p-5 glass-card bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-white transition-all active:scale-95"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">{t('logOut')}</span>
                </button>
            </motion.div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title={t('logOut')}
        message={t('confirmLogOut')}
        confirmText={t('logOut')}
        cancelText={t('cancel')}
        confirmColor="bg-red-600"
      />
    </div>
  );
};

export default Settings;
