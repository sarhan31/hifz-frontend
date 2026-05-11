import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Mic, Volume2, BookCheck, Settings, Brain } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  if (location.pathname.startsWith('/teacher')) {
    return null;
  }

  const navItems = [
    { path: '/', labelKey: 'home', icon: Home },
    { path: '/mushaf', labelKey: 'recite', icon: Mic },
    { path: '/makhraj', labelKey: 'learn', icon: Volume2 },
    { path: '/hifz-test', labelKey: 'hifzTest', icon: BookCheck },
    { path: '/hifz-health', labelKey: 'hifzHealth', icon: Brain },
    { path: '/settings', labelKey: 'settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-inherit backdrop-blur-xl z-50 pb-safe border-t border-white/10">
      <div className="h-[4.75rem] md:h-16 max-w-md mx-auto md:max-w-4xl">
        <div className="grid grid-cols-6 items-center h-full px-2 gap-1 md:flex md:justify-around md:gap-2 md:px-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex flex-col items-center justify-center min-w-0 rounded-xl p-1.5 transition-all duration-200 select-none touch-manipulation active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="w-6 h-6 md:w-5 md:h-5"
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span
                      className={`mt-1 text-[10px] leading-none font-semibold whitespace-nowrap ${
                        isActive ? 'text-emerald-300' : 'text-slate-400'
                      } group-hover:text-slate-100`}
                    >
                      {t(item.labelKey)}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
