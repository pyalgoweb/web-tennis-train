import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Target as TargetIcon, Zap, Settings, Eye, FastForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLoop } from '../../hooks/useGameLoop';

// 游戏配置
const TARGET_LINE_Y = 85; // 目标判定线位置 (%)
const HIDE_THRESHOLD_Y = 30; // 球消失的高度 (%)
const TARGET_RATIO = 9 / 16;
const PHYSICS = {
  gravity: 0.15,
  initialVyMin: 2,
  initialVyMax: 4,
  vxMax: 1.5
};

// 物理引擎核心逻辑
const updatePhysics = (state, speedMultiplier = 1) => {
  const next = { ...state };
  next.vy += PHYSICS.gravity * speedMultiplier;
  next.x += next.vx * speedMultiplier;
  next.y += next.vy * speedMultiplier;

  // 侧边墙壁反弹
  if (next.x < 5) {
    next.vx *= -1;
    next.x = 5;
  } else if (next.x > 95) {
    next.vx *= -1;
    next.x = 95;
  }
  return next;
};

const TrajectoryGame = ({ onBack }) => {
  const [gameState, setGameState] = useState('ready'); 
  const [ballPos, setBallPos] = useState({ x: 50, y: -10 });
  const [targetPos, setTargetPos] = useState({ x: null, y: null });
  const [userGuessX, setUserGuessX] = useState(null);
  const [score, setScore] = useState(null);
  const [trajectoryPath, setTrajectoryPath] = useState([]); 
  const [showGhostBalls, setShowGhostBalls] = useState(true); 
  const [isSlowMo, setIsSlowMo] = useState(false); 
  const [isFixedRatio, setIsFixedRatio] = useState(true); // 默认开启
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0, unit: 1 });

  const outerContainerRef = useRef(null);
  const arenaRef = useRef(null);
  const physicsRef = useRef({ x: 50, y: -10, vx: 0, vy: 0 });

  // 动态计算竞技场尺寸 (同步 RhythmGame 逻辑)
  useEffect(() => {
    const calculateSize = () => {
      const container = outerContainerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      let aw, ah;
      if (isFixedRatio) {
        if (cw / ch > TARGET_RATIO) {
          ah = ch; aw = ch * TARGET_RATIO;
        } else {
          aw = cw; ah = cw / TARGET_RATIO;
        }
      } else {
        aw = cw; ah = ch;
      }
      setArenaSize({ width: aw, height: ah, unit: ah / 100 });
    };
    const ro = new ResizeObserver(calculateSize);
    if (outerContainerRef.current) ro.observe(outerContainerRef.current);
    window.addEventListener('orientationchange', calculateSize);
    calculateSize();
    setTimeout(calculateSize, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', calculateSize);
    };
  }, [isFixedRatio]);

  const calculateRemainingPath = (startState) => {
    let current = { ...startState };
    const path = [];
    const multiplier = isSlowMo ? 0.4 : 1;
    while (current.y < TARGET_LINE_Y) {
      current = updatePhysics(current, multiplier);
      path.push({ x: current.x, y: current.y });
    }
    return path;
  };

  const startRound = () => {
    const startX = 10 + Math.random() * 80;
    const vx = (Math.random() - 0.5) * PHYSICS.vxMax * 2;
    const vy = PHYSICS.initialVyMin + Math.random() * (PHYSICS.initialVyMax - PHYSICS.initialVyMin);
    physicsRef.current = { x: startX, y: -10, vx, vy };
    setBallPos({ x: startX, y: -10 });
    setUserGuessX(null);
    setScore(null);
    setTargetPos({ x: null, y: null });
    setTrajectoryPath([{ x: startX, y: -10 }]);
    setGameState('observing');
  };

  useGameLoop(() => {
    if (gameState !== 'observing') return;
    const multiplier = isSlowMo ? 0.4 : 1;
    const nextState = updatePhysics(physicsRef.current, multiplier);
    physicsRef.current = nextState;
    setBallPos({ x: nextState.x, y: nextState.y });
    setTrajectoryPath(prev => [...prev, { x: nextState.x, y: nextState.y }]);
    if (nextState.y >= HIDE_THRESHOLD_Y) {
      const remainingPath = calculateRemainingPath(nextState);
      const lastPoint = remainingPath[remainingPath.length - 1] || nextState;
      setTargetPos({ x: lastPoint.x, y: lastPoint.y });
      setTrajectoryPath(prev => [...prev, ...remainingPath]);
      setGameState('predicting');
    }
  });

  const handleGuess = (e) => {
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return;
    }
    if (gameState === 'result') {
      startRound();
      return;
    }
    if (gameState !== 'predicting') return;

    // 判定逻辑适配竞技场容器
    const rect = arenaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setUserGuessX(x);
    const dist = Math.abs(x - targetPos.x);
    setScore(Math.max(0, Math.round(100 - dist * 5)));
    setGameState('result');
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  };

  const u = arenaSize.unit;

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-black select-none touch-none">
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-blue-900/20 z-[60] shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft /></button>
          <h2 className="text-xl font-bold italic text-white">弹道预测</h2>
        </div>
        <div className="flex items-center gap-4 relative">
          <button onPointerDown={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
            className={`p-2 rounded-xl border transition-all ${isSettingsOpen ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}>
            <Settings size={20} className={isSettingsOpen ? 'rotate-90' : ''} />
          </button>
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[100] p-2">
                <button onPointerDown={(e) => { e.stopPropagation(); setShowGhostBalls(!showGhostBalls); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><Eye size={16} /><span className="text-sm">保留位置参考</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${showGhostBalls ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${showGhostBalls ? 'right-1' : 'left-1'}`} /></div>
                </button>
                <button onPointerDown={(e) => { e.stopPropagation(); setIsSlowMo(!isSlowMo); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><FastForward size={16} /><span className="text-sm">慢放模式 (0.4x)</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${isSlowMo ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isSlowMo ? 'right-1' : 'left-1'}`} /></div>
                </button>
                <button onPointerDown={(e) => { e.stopPropagation(); setIsFixedRatio(!isFixedRatio); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><Layout size={16} /><span className="text-sm">竞技场比例 (9:16)</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${isFixedRatio ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isFixedRatio ? 'right-1' : 'left-1'}`} /></div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {score !== null && <div className="text-2xl font-mono font-black text-blue-400 italic">{score.toString().padStart(3, '0')}</div>}
        </div>
      </header>

      <div ref={outerContainerRef} className="flex-1 flex items-start justify-center bg-black overflow-hidden">
        <div ref={arenaRef} onPointerDown={handleGuess}
          className={`relative overflow-hidden transition-colors duration-75 shrink-0 ${isFixedRatio ? 'border-x border-white/20' : ''} bg-slate-900`}
          style={{ width: arenaSize.width || '100%', height: arenaSize.height || '100%' }}>
          
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
          </div>

          <div className="absolute left-0 right-0 h-1 bg-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] z-10" style={{ top: `${TARGET_LINE_Y}%` }}>
            <div className="absolute -top-6 left-4 text-[10px] font-black text-blue-400/60 uppercase tracking-widest">预测目标线</div>
          </div>

          <AnimatePresence>
            {gameState === 'observing' && (
              <motion.div initial={{ scale: 0, x: "-50%", y: "-50%" }} animate={{ scale: 1, x: "-50%", y: "-50%" }} exit={{ scale: 0, opacity: 0, x: "-50%", y: "-50%" }}
                className="absolute bg-tennis-ball rounded-full shadow-[0_0_30px_rgba(223,255,0,0.5)] z-20"
                style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%`, width: u * 6, height: u * 6 }}
              >
                <div className="absolute inset-0 rounded-full border-2 border-black/10 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          {showGhostBalls && (gameState === 'predicting' || gameState === 'result') && trajectoryPath.length > 0 && (
            <>
              {(() => {
                const startPoint = trajectoryPath.find(p => p.y >= 0);
                return startPoint && (
                  <div className="absolute border-2 border-dashed border-white/20 rounded-full z-10"
                    style={{ left: `${startPoint.x}%`, top: `${startPoint.y}%`, width: u * 6, height: u * 6, transform: 'translate(-50%, -50%)' }}>
                    <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/20 uppercase">Start</div>
                  </div>
                );
              })()}
              {(() => {
                const hidePoint = trajectoryPath.find(p => p.y >= HIDE_THRESHOLD_Y);
                return hidePoint && (
                  <div className="absolute border-2 border-dashed border-white/20 rounded-full z-10"
                    style={{ left: `${hidePoint.x}%`, top: `${hidePoint.y}%`, width: u * 6, height: u * 6, transform: 'translate(-50%, -50%)' }}>
                    <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/20 uppercase">Hide</div>
                  </div>
                );
              })()}
            </>
          )}

          {gameState === 'predicting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-600/90 backdrop-blur-md px-8 py-4 rounded-3xl border border-blue-400/30 shadow-2xl text-center">
                <Zap className="mx-auto mb-2 text-tennis-ball animate-pulse" />
                <p className="text-white font-black italic text-xl">球去哪了？</p>
                <p className="text-blue-100/70 text-sm mt-1">点击蓝色横线上你预判的落点</p>
              </motion.div>
            </div>
          )}

          {gameState === 'result' && (
            <>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <motion.path initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.8 }}
                  d={`M ${trajectoryPath.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')}`}
                  fill="none" stroke="url(#pathGradient)" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(223, 255, 0, 0.1)" /><stop offset="30%" stopColor="rgba(223, 255, 0, 0.4)" /><stop offset="100%" stopColor="rgba(223, 255, 0, 1)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute border-2 border-white rounded-full flex items-center justify-center z-30 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${userGuessX}%`, top: `${TARGET_LINE_Y}%`, width: u * 5, height: u * 5 }}>
                <div className="w-2 h-2 bg-white rounded-full" />
                <div className="absolute -bottom-8 whitespace-nowrap text-[8px] font-bold text-white uppercase">你的预判</div>
              </div>
              <motion.div initial={{ scale: 0, x: "-50%", y: "-50%" }} animate={{ scale: 1.2, x: "-50%", y: "-50%" }}
                className="absolute bg-tennis-ball rounded-full shadow-[0_0_40px_rgba(223,255,0,0.8)] z-20 flex items-center justify-center"
                style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%`, width: u * 6, height: u * 6 }}>
                <TargetIcon size={u * 3} className="text-black/40" />
                <div className="absolute -bottom-8 whitespace-nowrap text-[8px] font-bold text-tennis-ball uppercase">实际落点</div>
              </motion.div>
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <line x1={`${userGuessX}%`} y1={`${TARGET_LINE_Y}%`} x2={`${targetPos.x}%`} y2={`${targetPos.y}%`} stroke="white" strokeWidth="2" strokeDasharray="4 4" className="opacity-30" />
              </svg>
            </>
          )}

          {gameState === 'result' && (
            <div className="absolute inset-x-0 top-12 flex justify-center z-50 px-6 pointer-events-none">
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-800/90 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 shadow-2xl text-center w-full max-w-[280px]">
                <div className="flex flex-col items-center gap-1">
                  <div className="font-black text-white italic" style={{ fontSize: u * 6 }}>{score}</div>
                  <p className="font-bold uppercase tracking-[0.2em]" style={{ fontSize: u * 1.5, color: score >= 90 ? '#dfff00' : '#60a5fa' }}>
                    {score >= 95 ? '神级预判！' : score >= 85 ? '专业水准' : score >= 70 ? '基本吻合' : '继续观察'}
                  </p>
                  <p className="text-white/40 mt-3 font-bold uppercase tracking-widest animate-pulse" style={{ fontSize: u * 1.2 }}>点击屏幕重开</p>
                </div>
              </motion.div>
            </div>
          )}

          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-[100] p-8">
              <div className="bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20" style={{ width: u * 12, height: u * 12 }}>
                <TargetIcon size={u * 6} className="text-white" />
              </div>
              <h3 className="font-black text-white mb-4 italic text-center" style={{ fontSize: u * 4 }}>轨迹预测训练</h3>
              <p className="text-slate-400 mb-12 text-center leading-relaxed" style={{ fontSize: u * 2, maxWidth: u * 35 }}>
                观察网球运动的一小段轨迹，预判它最终触碰 <span className="text-blue-400 font-bold">蓝色目标线</span> 的位置。
              </p>
              <button onPointerDown={(e) => { e.stopPropagation(); startRound(); }}
                className="bg-blue-600 text-white rounded-2xl font-black italic tracking-widest shadow-2xl shadow-blue-500/30 transition-transform active:scale-95"
                style={{ padding: `${u * 2.5}px ${u * 8}px`, fontSize: u * 3 }}>
                START
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="p-6 bg-slate-900 border-t border-slate-800 text-center shrink-0">
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em]">观察轨迹 • 预判落点</p>
      </footer>
    </div>
  );
};

export default TrajectoryGame;
