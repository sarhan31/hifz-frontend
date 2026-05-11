import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';

const SurahBottomSheet = ({ isOpen, onClose, surahList, selectedSurahId, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSurahs = surahList.filter(surah => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    // Normalize names for better matching (e.g. Al-Fatihah -> fatihah)
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedQuery = normalize(query);
    const normalizedTransliteration = normalize(surah.transliteration);
    
    return (
      surah.id.toString() === query || 
      surah.id.toString().startsWith(query) ||
      normalizedTransliteration.includes(normalizedQuery) ||
      surah.name.includes(query) || 
      surah.transliteration.toLowerCase().includes(query)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[1000]"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 rounded-t-[32px] z-[1001] h-[80vh] flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden pb-safe"
          >
            {/* Handle / Drag Bar */}
            <div className="w-full flex justify-center py-4">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-6 pb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Select Surah</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="px-6 py-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search Surah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                />
              </div>
            </div>
            
            {/* Surah List */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-8">
              {filteredSurahs.length > 0 ? (
                <div className="space-y-1">
                  {filteredSurahs.map((surah) => {
                    const isSelected = selectedSurahId === surah.id;
                    return (
                      <button
                        key={surah.id}
                        onClick={() => {
                          onSelect(surah);
                          onClose();
                        }}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all active:scale-[0.98] ${
                          isSelected 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                            : 'text-slate-300 hover:bg-white/5 active:bg-white/10'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                          isSelected ? 'bg-white/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {surah.id}
                        </span>
                        
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                            {surah.transliteration}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                            {surah.id}. {surah.transliteration}
                          </p>
                        </div>
                        
                        <span className={`font-arabic text-xl ${isSelected ? 'text-white' : 'text-emerald-400'}`}>
                          {surah.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-slate-500">No Surahs found</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SurahBottomSheet;
