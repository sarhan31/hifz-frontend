import React from 'react';

const SkeletonPulse = ({ className }) => (
  <div className={`bg-white/5 animate-pulse rounded-lg ${className}`} />
);

const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen w-full p-4 md:p-6 flex flex-col items-center font-sans">
      <div className="w-full max-w-lg md:max-w-2xl">
        {/* Header Skeleton */}
        <header className="mb-8 text-center mt-8 md:mt-12 relative">
          <SkeletonPulse className="h-8 w-8 absolute right-0 top-0 rounded-full" />
          <SkeletonPulse className="h-10 w-3/4 mx-auto mb-3" />
          <SkeletonPulse className="h-4 w-1/3 mx-auto mb-2" />
          <SkeletonPulse className="h-4 w-1/2 mx-auto" />
        </header>

        {/* Strength Overview Skeleton */}
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/5 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SkeletonPulse className="w-10 h-10 rounded-lg" />
              <div className="space-y-2">
                <SkeletonPulse className="h-6 w-40" />
                <SkeletonPulse className="h-3 w-32" />
              </div>
            </div>
            <SkeletonPulse className="h-8 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonPulse key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Streak Skeleton */}
        <SkeletonPulse className="h-24 rounded-2xl mb-8" />

        {/* Plan Skeleton */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/5 mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SkeletonPulse className="w-8 h-8 rounded-lg" />
              <div className="space-y-2">
                <SkeletonPulse className="h-6 w-32" />
                <SkeletonPulse className="h-3 w-48" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonPulse key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Recent Recitations Skeleton */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/5 mb-24">
           <div className="flex items-center gap-3 mb-6">
              <SkeletonPulse className="w-8 h-8 rounded-lg" />
              <SkeletonPulse className="h-6 w-40" />
           </div>
           <div className="space-y-3">
             {[1, 2, 3].map((i) => (
               <SkeletonPulse key={i} className="h-12 rounded-lg" />
             ))}
           </div>
        </div>

        {/* Sticky Bottom CTA Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-50 md:static md:bg-none md:p-0">
            <SkeletonPulse className="w-full h-16 rounded-2xl md:max-w-2xl md:mx-auto" />
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
