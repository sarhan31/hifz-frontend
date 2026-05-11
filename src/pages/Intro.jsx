import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookCheck, Brain, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';



const Intro = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);

  const slides = [
    {
      icon: BookCheck,
      title: t('hifzTest'),
      desc: t('hifzTestDesc'),
    },
    {
      icon: Brain,
      title: t('hifzHealth'),
      desc: t('hifzHealthDesc'),
    },
    {
      icon: Target,
      title: t('disciplineSystem'),
      desc: t('disciplineSystemDesc'),
    },
  ];

  const next = () => setIndex(prev => Math.min(prev + 1, slides.length - 1));
  const prev = () => setIndex(prev => Math.max(prev - 1, 0));

  const finish = () => {
    if (user?.id) {
      localStorage.setItem(`has_seen_intro_${user.id}`, 'true');
    }
    navigate('/', { replace: true });
  };

  const SlideIcon = slides[index].icon;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm text-center"
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-900/30 border border-emerald-500/40 flex items-center justify-center mb-4">
          <SlideIcon className="w-7 h-7 text-emerald-300" />
        </div>
        <h2 className="text-xl font-bold mb-1">{slides[index].title}</h2>
        <p className="text-sm text-emerald-200">{slides[index].desc}</p>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={index === 0}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-40"
          >
            {t('back')}
          </button>
          {index < slides.length - 1 ? (
            <button
              onClick={next}
              className="px-4 py-2 rounded-lg bg-emerald-600/30 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/40 transition-colors"
            >
              {t('next')}
            </button>
          ) : (
            <button
              onClick={finish}
              className="px-4 py-2 rounded-lg bg-emerald-600/30 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/40 transition-colors"
            >
              {t('start')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Intro;
