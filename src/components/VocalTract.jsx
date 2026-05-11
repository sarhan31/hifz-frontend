import React from 'react';

const VocalTract = ({ activeLetter, articulationPoint }) => {
  // Medical Illustration Style SVG
  // Midsagittal section of the head and neck
  // Coordinates based on 500x500 viewBox for higher detail

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white rounded-xl overflow-hidden p-2">
      <svg 
        viewBox="0 0 500 500" 
        className="w-full h-full max-h-[500px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F5D0C5" />
            <stop offset="100%" stopColor="#E8B4A2" />
          </linearGradient>
          <linearGradient id="muscleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E08E79" />
            <stop offset="100%" stopColor="#C46D5A" />
          </linearGradient>
           <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Base Head Outline (Face Profile) */}
        <path 
            d="M 250,50 
               Q 200,50 160,80 
               Q 130,110 120,150 
               L 100,180 
               Q 90,200 110,210 
               L 115,212 
               Q 100,215 100,230 
               Q 100,245 115,250 
               Q 105,260 110,270 
               Q 120,290 150,320 
               Q 180,350 180,450 
               L 180,500 
               L 400,500 
               L 400,50 
               Z"
            fill="url(#skinGradient)"
            stroke="#D4A59A"
            strokeWidth="2"
        />

        {/* 2. Cranial Cavity & Spine (Background Bone/Structure) */}
        <path 
            d="M 250,80 Q 350,80 380,200 L 380,500 L 280,500 L 280,300 Q 280,200 250,150" 
            fill="#F3E5DC" 
            opacity="0.5"
        />

        {/* 3. Oral & Nasal Cavity (The "Empty Space") */}
        {/* Drawn as a dark background shape first, then overlaid with organs */}
        <path 
            d="M 120,180 
               Q 150,150 200,150 
               Q 250,150 280,200 
               L 280,450 
               L 220,450 
               L 220,350 
               Q 220,280 180,280 
               Q 140,280 130,250 
               Z" 
            fill="#5D4037" 
            opacity="0.2"
        />

        {/* 4. Upper Structure: Hard Palate, Soft Palate (Velum), Uvula */}
        <path 
            d="M 130,212 
               L 180,200 
               Q 220,190 240,220 
               Q 250,235 250,250 
               Q 240,240 230,220 
               Q 200,210 130,212"
            fill="#E57373"
            stroke="#C62828"
            strokeWidth="1"
        />

        {/* 5. Tongue (Complex Shape) */}
        {/* Root, Body, Tip */}
        <path 
            d="M 130,250 
               Q 150,260 180,260 
               Q 230,260 250,300 
               Q 270,350 270,450 
               L 180,450 
               Q 180,350 150,320 
               Q 130,300 130,250" 
            fill="#FF8A80"
            stroke="#D32F2F"
            strokeWidth="1"
        />

        {/* 6. Teeth */}
        {/* Upper Incisor */}
        <path d="M 125,212 L 125,225 L 132,225 L 132,210 Z" fill="#FFEBEE" stroke="#E0E0E0" />
        {/* Lower Incisor */}
        <path d="M 125,250 L 125,237 L 132,237 L 132,252 Z" fill="#FFEBEE" stroke="#E0E0E0" />

        {/* 7. Lips */}
        {/* Upper Lip */}
        <path d="M 115,212 Q 100,215 105,225 Q 120,225 125,212" fill="#EF9A9A" />
        {/* Lower Lip */}
        <path d="M 115,250 Q 100,247 105,237 Q 120,237 125,250" fill="#EF9A9A" />

        {/* 8. Throat / Pharynx Wall */}
        <path 
            d="M 280,200 Q 280,300 280,450" 
            stroke="#E57373" 
            strokeWidth="3" 
            fill="none" 
        />
        
        {/* 9. Nasal Cavity Detail (Turbinates hint) */}
        <path 
            d="M 180,150 Q 200,160 220,150 Q 210,180 180,180" 
            fill="none" 
            stroke="#D7CCC8" 
            strokeWidth="2" 
            opacity="0.6"
        />

        {/* Static Labels for clarity */}
        <g className="font-sans font-bold fill-slate-800" style={{ fontSize: '14px', textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}>
            <text x="290" y="320">Throat (Pharynx)</text>
            <text x="210" y="130">Nasal Cavity</text>
            <text x="40" y="235">Lips</text>
            <text x="200" y="380">Tongue Root</text>
            <text x="260" y="240">Soft Palate</text>
            <text x="160" y="190">Hard Palate</text>
        </g>

        {/* Articulation Point Indicator */}
        {articulationPoint && (
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
             {/* Pulsing Target */}
             <motion.circle
              cx={articulationPoint.x}
              cy={articulationPoint.y}
              fill="url(#glow)"
              initial={{ r: 20, opacity: 0.6 }}
              animate={{ r: [15, 25, 15], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            
            {/* Pointer Line and Label */}
            <line 
                x1={articulationPoint.x} 
                y1={articulationPoint.y} 
                x2={350} 
                y2={articulationPoint.y < 250 ? 100 : 400} 
                stroke="#7C3AED" 
                strokeWidth="1.5"
                strokeDasharray="4 2"
            />
            
            <circle cx={articulationPoint.x} cy={articulationPoint.y} r="4" fill="#7C3AED" stroke="white" strokeWidth="1" />

            <g transform={`translate(350, ${articulationPoint.y < 250 ? 90 : 390})`}>
                 <rect x="0" y="0" width="140" height="36" rx="6" fill="#7C3AED" className="shadow-lg" />
                 <text x="70" y="24" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                     Articulation Point
                 </text>
            </g>

          </motion.g>
        )}
      </svg>
    </div>
  );
};

export default VocalTract;
