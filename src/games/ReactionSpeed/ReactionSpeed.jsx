import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, RefreshCw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ReactionSpeed = ({ onBack }) => {
  const [gameState, setGameState] = useState('ready'); // ready, waiting, active, result
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(null);
  const [bestTime, setBestTime] = useState(() => {
    return localStorage.getItem('tennis_best_reaction') || null;
  });
  const timerRef = useRef(null);

  const startTest = () => {
    setGameState('waiting');
    setReactionTime(null);
    
    // 随机等待 2-5 秒
    const waitTime = 2000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setGameState('active');
      setStartTime(performance.now());
    }, waitTime);
  };

  const handlePointerDown = () => {
    if (gameState === 'waiting') {
      // 太早了！
      clearTimeout(timerRef.current);
      setGameState('ready');
      alert('太早了！请等到颜色变化后再点击。');
    } else if (gameState === 'active') {
      const endTime = performance.now();
      const time = Math.round(endTime - startTime);
      setReactionTime(time);
      setGameState('result');
      
      if (!bestTime || time < bestTime) {
        setBestTime(time);
        localStorage.setItem('tennis_best_reaction', time);
      }
      
      if (window.navigator.vibrate) window.navigator.vibrate(20);
    }
  };

  const getRating = (time) => {
    if (time < 200) return { text: '顶级职业选手', color: 'text-yellow-400' };
    if (time < 250) return { text: '专业水准', color: 'text-green-400' };
    if (time < 300) return { text: '优秀', color: 'text-blue-400' };
    return { text: '继续努力', color: 'text-slate-400' };
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden select-none touch-none bg-slate-950">
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400">
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-bold italic tracking-tight text-white">反应速度测试</h2>
        </div>
        {bestTime && (
          <div className="flex items-center gap-2 text-xs font-bold text-tennis-ball bg-tennis-ball/10 px-3 py-1 rounded-full border border-tennis-ball/20">
            <Trophy size={14} />
            BEST: {bestTime}ms
          </div>
        )}
      </header>

      <main 
        onPointerDown={handlePointerDown}
        className={`flex-1 flex flex-col items-center justify-center transition-colors duration-75 ${
          gameState === 'active' ? 'bg-tennis-ball' : 
          gameState === 'waiting' ? 'bg-red-900/40' : 'bg-slate-950'
        }`}
      >
        <AnimatePresence mode="wait">
          {gameState === 'ready' && (
            <motion.div 
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center p-8"
            >
              <div className="w-24 h-24 bg-slate-900 border-2 border-slate-800 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                <Zap size={48} className="text-tennis-ball" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4 italic">准备测试？</h3>
              <p className="text-slate-400 mb-10 leading-relaxed max-w-[260px] mx-auto">
                点击屏幕开始，当屏幕变为 <span className="text-tennis-ball font-bold italic">荧光绿</span> 时，以最快速度点击屏幕！
              </p>
              <button
                onPointerDown={(e) => { e.stopPropagation(); startTest(); }}
                className="px-16 py-5 bg-tennis-ball text-black rounded-2xl font-black text-2xl italic tracking-widest shadow-2xl shadow-tennis-ball/30"
              >
                开始测试
              </button>
            </motion.div>
          )}

          {gameState === 'waiting' && (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-4xl font-black text-white/20 italic uppercase tracking-[0.2em] animate-pulse">
                等待变化...
              </p>
            </motion.div>
          )}

          {gameState === 'active' && (
            <motion.div 
              key="active"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className="text-6xl font-black text-black italic uppercase tracking-tighter">
                现在点击！
              </p>
            </motion.div>
          )}

          {gameState === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-8 bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl mx-6"
            >
              <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">你的反应时间</h3>
              <div className="text-7xl font-mono font-black text-white mb-4 italic tracking-tighter">
                {reactionTime}<span className="text-2xl ml-1">ms</span>
              </div>
              
              <div className={`text-xl font-bold mb-10 ${getRating(reactionTime).color}`}>
                {getRating(reactionTime).text}
              </div>

              <button
                onPointerDown={(e) => { e.stopPropagation(); startTest(); }}
                className="w-full flex items-center justify-center gap-3 px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-colors border border-slate-700 shadow-xl"
              >
                <RefreshCw size={24} />
                再次测试
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-8 text-center bg-slate-950/50">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
          强化你的神经传导速度
        </p>
      </footer>
    </div>
  );
};

export default ReactionSpeed;

