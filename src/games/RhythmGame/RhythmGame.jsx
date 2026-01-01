import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Settings, Eye, EyeOff, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLoop } from '../../hooks/useGameLoop';

// 游戏物理常量 - 严格单位制
const BALL_SPEED = 0.45; 
const HIT_ZONE_Y = 80; 
const HIT_THRESHOLD = 10; 

const RhythmGame = ({ onBack }) => {
  const [balls, setBalls] = useState([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [gameState, setGameState] = useState('ready'); 
  const [hitEffect, setHitEffect] = useState(null); 
  const [hideZones, setHideZones] = useState(false);
  const [pauseOnHit, setPauseOnHit] = useState(false);
  const [isFixedRatio, setIsFixedRatio] = useState(false); // 固定比例模式
  const [isPaused, setIsPaused] = useState(false);
  const [capturedBallId, setCapturedBallId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // 核心 Ref 体系：直接对接物理引擎
  const ballsRef = useRef([]);
  const containerRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);

  const startGame = () => {
    setBalls([]);
    ballsRef.current = [];
    setScore(0);
    scoreRef.current = 0;
    setGameState('playing');
    setIsSettingsOpen(false);
    lastSpawnRef.current = performance.now();
  };

  const spawnBall = useCallback(() => {
    const newBall = {
      id: Math.random().toString(36).substr(2, 9),
      y: -10, 
    };
    ballsRef.current = [newBall];
    setBalls([newBall]);
  }, []);

  const triggerFeedback = useCallback((type) => {
    const configs = {
      PERFECT: { text: 'PERFECT', color: 'text-yellow-400', vibe: [10, 20, 10] },
      GREAT: { text: 'GREAT', color: 'text-green-400', vibe: [30] },
      GOOD: { text: 'GOOD', color: 'text-blue-400', vibe: [20] },
      MISS: { text: 'MISS', color: 'text-red-500', vibe: [80] }
    };
    const config = configs[type];
    const id = Date.now();
    
    // 渲染：瞬间触发
    setHitEffect({ type, id });
    setFeedback({ text: config.text, colorClass: config.color, id });
    
    // 震动：放在下一帧，防止阻塞 UI
    requestAnimationFrame(() => {
      if (window.navigator.vibrate) window.navigator.vibrate(config.vibe);
    });

    setTimeout(() => {
      setHitEffect(prev => prev?.id === id ? null : prev);
      setFeedback(prev => prev?.id === id ? null : prev);
    }, 500);
  }, []);

  useGameLoop((deltaTime) => {
    if (gameState !== 'playing' || isPaused) return;
    const now = performance.now();
    
    if (ballsRef.current.length === 0 && now - lastSpawnRef.current > 1200) {
      spawnBall();
      lastSpawnRef.current = now;
    }

    const updated = ballsRef.current.map(ball => ({
      ...ball,
      y: ball.y + (BALL_SPEED * deltaTime) / 6,
    })).filter(ball => {
      if (ball.y > 105) {
        lastSpawnRef.current = performance.now();
        return false;
      }
      return true;
    });

    ballsRef.current = updated;
    setBalls(updated); 
  });

      const handleHit = (e) => {
        // 性能关键：阻止浏览器默认事件处理
        if (e) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
        }

        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        
        const hitTime = performance.now();
        lastSpawnRef.current = hitTime;

        if (isPaused) {
          setIsPaused(false);
          if (capturedBallId) {
            ballsRef.current = ballsRef.current.filter(b => b.id !== capturedBallId);
            setBalls(ballsRef.current);
            setCapturedBallId(null);
          }
          return;
        }

        if (gameState !== 'playing') return;

        // 【物理对齐核心】找回丢失的物理像素判定，适配竞技场容器
        const h = containerRef.current?.clientHeight || 0;
        const hitZoneYPx = h * (HIT_ZONE_Y / 100);
        const closestBall = ballsRef.current[0];

        if (closestBall) {
          const ballYPx = (closestBall.y / 100) * h;
          const distPx = Math.abs(ballYPx - hitZoneYPx);
          const maxThresholdPx = h * (HIT_THRESHOLD / 100);

          if (distPx <= maxThresholdPx) {
            const relativeDist = (distPx / h) * 100;
            let points = 0, type = '';
            
            // 判定分级与视觉辅助圈完美对齐
            if (relativeDist <= 2.5) { points = 100; type = 'PERFECT'; }
            else if (relativeDist <= 6) { points = 50; type = 'GREAT'; }
            else { points = 20; type = 'GOOD'; }

            scoreRef.current += points;
            setScore(scoreRef.current);
            triggerFeedback(type);

            if (pauseOnHit) {
              setIsPaused(true);
              setCapturedBallId(closestBall.id);
            } else {
              ballsRef.current = [];
              setBalls([]);
            }
          } else {
            triggerFeedback('MISS');
            if (pauseOnHit) {
              setIsPaused(true);
              setCapturedBallId(closestBall.id);
            }
          }
        } else {
          triggerFeedback('MISS');
        }
      };

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-slate-950 select-none touch-none">
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-emerald-900/20 z-[60]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft /></button>
          <h2 className="text-xl font-bold italic text-white">节奏专家</h2>
        </div>
        <div className="flex items-center gap-4 relative">
          <button 
            onPointerDown={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
            className={`p-2 rounded-xl border transition-all ${isSettingsOpen ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}
          >
            <Settings size={20} className={isSettingsOpen ? 'rotate-90' : ''} />
          </button>
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[100] p-2">
                <button onPointerDown={(e) => { e.stopPropagation(); setHideZones(!hideZones); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><EyeOff size={16} /><span className="text-sm">专家模式 (隐藏范围)</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${hideZones ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${hideZones ? 'right-1' : 'left-1'}`} /></div>
                </button>
                <button onPointerDown={(e) => { e.stopPropagation(); setPauseOnHit(!pauseOnHit); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><RefreshCw size={16} /><span className="text-sm">击球后暂停</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${pauseOnHit ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${pauseOnHit ? 'right-1' : 'left-1'}`} /></div>
                </button>
                <button onPointerDown={(e) => { e.stopPropagation(); setIsFixedRatio(!isFixedRatio); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><Layout size={16} /><span className="text-sm">竞技场比例 (9:16)</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${isFixedRatio ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isFixedRatio ? 'right-1' : 'left-1'}`} /></div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="text-3xl font-mono font-black text-tennis-ball italic">{score.toString().padStart(5, '0')}</div>
        </div>
      </header>

      <main 
        ref={containerRef} 
        className={`flex-1 relative overflow-hidden touch-none transition-colors duration-75 mx-auto ${
          isFixedRatio ? 'aspect-[9/16] h-full w-auto border-x border-white/10 shadow-2xl' : 'w-full'
        } ${
          hitEffect?.type === 'PERFECT' ? 'bg-yellow-500/10' : 
          hitEffect?.type === 'MISS' ? 'bg-red-500/10' : 
          'bg-slate-900'
        }`} 
        onPointerDown={handleHit}
      >
        <AnimatePresence>
          {hitEffect && (
            <motion.div 
              initial={{ opacity: 0.6, scale: 0.5, y: "-50%" }} 
              animate={{ opacity: 0, scale: 2, y: "-50%" }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.3 }} 
              style={{ top: `${HIT_ZONE_Y}%`, left: 0, right: 0 }} 
              className={`absolute h-32 blur-3xl pointer-events-none z-0 ${
                hitEffect.type === 'PERFECT' ? 'bg-yellow-400/30' : 
                hitEffect.type === 'GREAT' ? 'bg-green-400/20' : 
                hitEffect.type === 'GOOD' ? 'bg-blue-400/15' : 'bg-red-500/25'
              }`} 
            />
          )}
        </AnimatePresence>

        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute left-0 right-0 h-[2px] bg-white/40 -translate-y-1/2" style={{ top: `${HIT_ZONE_Y}%` }} />
          {!hideZones ? (
            <div className="absolute inset-0">
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] border-[2px] border-blue-500/40 rounded-full bg-blue-500/5" style={{ top: `${HIT_ZONE_Y}%`, height: '20%' }} />
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[84%] border-[2px] border-green-500/50 rounded-full bg-green-500/5" style={{ top: `${HIT_ZONE_Y}%`, height: '12%' }} />
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[74%] border-[3px] border-yellow-400/60 rounded-full bg-yellow-400/10 shadow-[0_0_30px_rgba(250,204,21,0.2)]" style={{ top: `${HIT_ZONE_Y}%`, height: '5%' }} />
            </div>
          ) : (
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[76%] border-[2px] border-dashed border-white/20 rounded-full" style={{ top: `${HIT_ZONE_Y}%`, height: '8%' }} />
          )}
          <AnimatePresence>
            {hitEffect && hitEffect.type !== 'MISS' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-50%" }} 
                animate={{ opacity: 0.5, scale: 1.2, x: "-50%", y: "-50%" }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.2 }} 
                style={{ top: `${HIT_ZONE_Y}%`, left: "50%", height: "10%", width: "60%" }} 
                className={`absolute rounded-full blur-3xl ${
                  hitEffect.type === 'PERFECT' ? 'bg-yellow-400' : 
                  hitEffect.type === 'GREAT' ? 'bg-green-400' : 'bg-blue-400'
                }`} 
              />
            )}
          </AnimatePresence>
        </div>

        {balls.map(ball => (
          <div key={ball.id} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 z-20" style={{ top: `${ball.y}%`, background: `radial-gradient(circle at 35% 35%, #dfff00 0%, #c2e600 50%, #a2c100 100%)`, borderRadius: '50%', boxShadow: 'inset -6px -6px 12px rgba(0,0,0,0.3), inset 6px 6px 12px rgba(255,255,255,0.4), 0 5px 15px rgba(0,0,0,0.4)', willChange: 'top' }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full"><path d="M 5,50 C 5,10 50,10 50,50 C 50,90 95,90 95,50" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="10" strokeLinecap="round" transform="rotate(-15 50 50)" /><path d="M 5,50 C 5,10 50,10 50,50 C 50,90 95,90 95,50" fill="none" stroke="#f5f5f5" strokeWidth="7" strokeLinecap="round" className="opacity-80" transform="rotate(-15 50 50)" /></svg>
            <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-20" />
            {!hideZones && <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full shadow-[0_0_10px_white] z-30" />}
          </div>
        ))}

        <AnimatePresence>
          {feedback && <motion.div key={feedback.id} initial={{ opacity: 0, scale: 0.3, y: 0 }} animate={{ opacity: 1, scale: 1.2, y: -120 }} exit={{ opacity: 0 }} style={{ top: `${HIT_ZONE_Y}%` }} className={`absolute left-0 right-0 text-center -translate-y-1/2 text-6xl font-black italic tracking-tighter ${feedback.colorClass} drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] pointer-events-none z-50`}>{feedback.text}</motion.div>}
        </AnimatePresence>

        {(gameState === 'ready' || isPaused) && (
          <div className={`absolute inset-0 flex flex-col items-center z-50 transition-all ${isPaused ? 'bg-black/5' : 'bg-black/80 backdrop-blur-sm justify-center p-8'}`}>
            {isPaused ? (
              <div className="mt-16 bg-black/60 border border-white/20 px-8 py-4 rounded-full backdrop-blur-xl shadow-2xl">
                <h3 className="text-2xl font-black text-tennis-ball italic flex items-center gap-3"><RefreshCw size={24} className="animate-spin" /> 暂停中</h3>
                <p className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mt-2 text-center">点击屏幕继续训练</p>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-5xl font-black text-white mb-4 italic">GO!</h3>
                <p className="text-slate-400 mb-12 max-w-[280px] mx-auto text-lg leading-tight">
                  在网球进入{!hideZones ? '彩色' : '判定'}区域的瞬间点击屏幕
                </p>
                <motion.button whileTap={{ scale: 0.9 }} onPointerDown={(e) => { e.stopPropagation(); startGame(); }} className="px-20 py-6 bg-tennis-ball text-black rounded-3xl font-black text-3xl italic tracking-widest shadow-[0_20px_50px_rgba(225,255,0,0.3)]">START</motion.button>
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="p-8 bg-slate-900 border-t border-slate-800 text-center z-50"><p className="text-slate-500 font-bold text-xs uppercase tracking-[0.4em] animate-pulse">点击屏幕击球</p></footer>
    </div>
  );
};

export default RhythmGame;
