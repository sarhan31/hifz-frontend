import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle, Repeat, Mic } from 'lucide-react';

const AyahActionBottomSheet = ({ isOpen, onClose, ayah, onPlay, onRepeat, onRecite }) => {
  if (!ayah) return null;

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={stopPropagation}
            className="w-full max-w-lg bg-slate-900/80 backdrop-blur-2xl rounded-t-3xl p-5 border-t border-white/10"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                Ayah {ayah.ayah_number}
              </h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2">
              <ActionButton icon={PlayCircle} label="Play Audio" onClick={onPlay} />
              <ActionButton icon={Repeat} label="Repeat Ayah" onClick={onRepeat} />
              <ActionButton icon={Mic} label="Recite From Here" onClick={onRecite} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ActionButton = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 rounded-xl text-left text-white text-base font-semibold hover:bg-emerald-500/10 active:bg-emerald-500/20 transition-colors"
  >
    <Icon className="w-6 h-6 text-emerald-400" />
    {label}
  </button>
);

export default AyahActionBottomSheet;
