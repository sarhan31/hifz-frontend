import React from 'react';
import { motion } from 'framer-motion';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center p-6 bg-white/5 rounded-2xl border border-white/5">
      <motion.div
        className="p-4 bg-emerald-500/10 rounded-full mb-4 text-emerald-400"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120 }}
      >
        <Icon className="w-8 h-8 md:w-10 md:h-10" />
      </motion.div>
      <h3 className="text-lg md:text-xl font-semibold text-emerald-50 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
