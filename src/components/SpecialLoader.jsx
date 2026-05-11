import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

const SpecialLoader = ({ message = "Loading..." }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Outer Rotating Ring */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-emerald-500/30 rounded-full"
                />
                
                {/* Pulsing Glow */}
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-2 bg-emerald-500/10 rounded-full blur-xl"
                />

                {/* Islamic Star / Octagram Rotating */}
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 flex items-center justify-center opacity-20"
                >
                    <div className="absolute w-full h-full border border-emerald-400 rotate-45" />
                    <div className="absolute w-full h-full border border-emerald-400" />
                </motion.div>

                {/* Center Icon */}
                <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-emerald-400/50"
                >
                    <BookOpen className="w-6 h-6 text-white" />
                </motion.div>

                {/* Orbiting Particle */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,1)]" />
                </motion.div>
            </div>

            <div className="text-center space-y-1">
                <motion.p 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white font-black text-xs uppercase tracking-[0.3em] ml-1"
                >
                    {message}
                </motion.p>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest opacity-50">Hafiz AI is preparing</p>
            </div>
        </div>
    );
};

export default SpecialLoader;
