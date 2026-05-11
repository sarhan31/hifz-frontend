import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

const SpecialLoader = ({ message = "Loading..." }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-8 p-12 min-h-[300px] w-full">
            <div className="relative w-32 h-32 flex items-center justify-center">
                
                {/* 1. Ambient Background Glow */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.4, 1],
                        opacity: [0.1, 0.25, 0.1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-emerald-500 rounded-full blur-[60px]"
                />

                {/* 2. Outer Rotating Dashed Ring */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-[1px] border-dashed border-emerald-500/20 rounded-full"
                />

                {/* 3. Middle Rotating Ring with Gap */}
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 border-t-2 border-l-2 border-emerald-400/40 rounded-full"
                />
                
                {/* 4. Islamic Star / Octagram Rotating (Geometric Layer) */}
                <motion.div 
                    animate={{ rotate: 180 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-6 flex items-center justify-center opacity-15"
                >
                    <div className="absolute w-full h-full border border-emerald-300 rotate-45" />
                    <div className="absolute w-full h-full border border-emerald-300" />
                </motion.div>

                {/* 5. Center Icon Container */}
                <motion.div
                    animate={{ 
                        y: [0, -8, 0],
                        boxShadow: [
                            "0 0 20px rgba(16,185,129,0.2)",
                            "0 0 40px rgba(16,185,129,0.5)",
                            "0 0 20px rgba(16,185,129,0.2)"
                        ]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[20px] flex items-center justify-center border border-emerald-400/50"
                >
                    <BookOpen className="w-7 h-7 text-white drop-shadow-md" />
                </motion.div>

                {/* 6. Orbiting Particles */}
                {[0, 120, 240].map((angle, i) => (
                    <motion.div 
                        key={i}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0"
                        style={{ rotate: angle }}
                    >
                        <motion.div 
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
                            className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,1)]" 
                        />
                    </motion.div>
                ))}

                {/* 7. Pulse Ring */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 border border-emerald-500/30 rounded-full"
                />
            </div>

            <div className="text-center space-y-2 relative z-10">
                <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                >
                    <p className="text-white font-black text-sm uppercase tracking-[0.4em] ml-1">
                        {message}
                    </p>
                </motion.div>
                <div className="flex items-center justify-center gap-2">
                    <span className="w-8 h-px bg-emerald-500/20" />
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest opacity-60">Hafiz AI is preparing</p>
                    <span className="w-8 h-px bg-emerald-500/20" />
                </div>
            </div>
        </div>
    );
};

export default SpecialLoader;
