import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Target as TargetIcon, Zap, Settings, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLoop } from '../../hooks/useGameLoop';

// 游戏配置
const TARGET_LINE_Y = 85; // 目标判定线位置 (%)
const HIDE_THRESHOLD_Y = 30; // 球消失的高度 (%)
const PHYSICS = {
  gravity: 0.15,
  initialVyMin: 2,
  initialVyMax: 4,
  vxMax: 1.5
};

// 物理引擎核心逻辑：确保游戏循环和预测算法完全一致
const updatePhysics = (state) => {
  const next = { ...state };
  next.vy += PHYSICS.gravity;
  next.x += next.vx;
  next.y += next.vy;

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
  const [gameState, setGameState] = useState('ready'); // ready, observing, predicting, result
  const [ballPos, setBallPos] = useState({ x: 50, y: -10 });
  const [targetPos, setTargetPos] = useState({ x: null, y: null });
  const [userGuessX, setUserGuessX] = useState(null);
  const [score, setScore] = useState(null);
  const [trajectoryPath, setTrajectoryPath] = useState([]); 
  const [showGhostBalls, setShowGhostBalls] = useState(true); // 默认开启“保留参考位置”
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const containerRef = useRef(null);
  
  // 物理状态 Ref - 仅存储当前帧状态
  const physicsRef = useRef({
    x: 50,
    y: -10,
    vx: 0,
    vy: 0
  });

  // 计算剩余路径
  const calculateRemainingPath = (startState) => {
    let current = { ...startState };
    const path = [];
    while (current.y < TARGET_LINE_Y) {
      current = updatePhysics(current);
      path.push({ x: current.x, y: current.y });
    }
    return path;
  };

  const startRound = () => {
    const startX = 10 + Math.random() * 80;
    const vx = (Math.random() - 0.5) * PHYSICS.vxMax * 2;
    const vy = PHYSICS.initialVyMin + Math.random() * (PHYSICS.initialVyMax - PHYSICS.initialVyMin);

    const initialState = { x: startX, y: -10, vx, vy };
    physicsRef.current = initialState;

    setBallPos({ x: startX, y: -10 });
    setUserGuessX(null);
    setScore(null);
    setTargetPos({ x: null, y: null });
    setTrajectoryPath([{ x: startX, y: -10 }]);
    setGameState('observing');
  };

  useGameLoop(() => {
    if (gameState !== 'observing') return;

    // 统一调用核心物理函数
    const nextState = updatePhysics(physicsRef.current);
    physicsRef.current = nextState;

    setBallPos({ x: nextState.x, y: nextState.y });
    setTrajectoryPath(prev => [...prev, { x: nextState.x, y: nextState.y }]);

    // 达到消失阈值
    if (nextState.y >= HIDE_THRESHOLD_Y) {
      const remainingPath = calculateRemainingPath(nextState);
      const lastPoint = remainingPath[remainingPath.length - 1] || nextState;
      
      setTargetPos({ x: lastPoint.x, y: lastPoint.y });
      setTrajectoryPath(prev => [...prev, ...remainingPath]);
      setGameState('predicting');
    }
  });

  const handleGuess = (e) => {
    if (gameState !== 'predicting') return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    
    setUserGuessX(x);
    
    // 计算得分
    const dist = Math.abs(x - targetPos.x);
    const roundScore = Math.max(0, Math.round(100 - dist * 5));
    setScore(roundScore);
    setGameState('result');
    
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  };

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-slate-950 select-none touch-none">
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-blue-900/20 z-[60]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400">
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-bold italic text-white">弹道预测</h2>
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
                <button onPointerDown={(e) => { e.stopPropagation(); setShowGhostBalls(!showGhostBalls); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><Eye size={16} /><span className="text-sm">保留位置参考</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${showGhostBalls ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${showGhostBalls ? 'right-1' : 'left-1'}`} /></div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {score !== null && (
            <div className="text-2xl font-mono font-black text-blue-400 italic">
              {score.toString().padStart(3, '0')}
            </div>
          )}
        </div>
      </header>

      <main 
        ref={containerRef}
        className="flex-1 relative bg-slate-900 overflow-hidden cursor-crosshair"
        onPointerDown={handleGuess}
      >
        {/* 球场装饰 */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
        </div>

        {/* 目标判定线 */}
        <div className="absolute left-0 right-0 h-1 bg-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] z-10" style={{ top: `${TARGET_LINE_Y}%` }}>
          <div className="absolute -top-6 left-4 text-[10px] font-black text-blue-400/60 uppercase tracking-widest">预测目标线</div>
        </div>

        {/* 网球 */}
        <AnimatePresence>
          {gameState === 'observing' && (
            <motion.div
              initial={{ scale: 0, x: "-50%", y: "-50%" }}
              animate={{ scale: 1, x: "-50%", y: "-50%" }}
              exit={{ scale: 0, opacity: 0, x: "-50%", y: "-50%" }}
              transition={{ duration: 0.1 }}
              className="absolute w-12 h-12 bg-tennis-ball rounded-full shadow-[0_0_30px_rgba(223,255,0,0.5)] z-20"
              style={{ 
                left: `${ballPos.x}%`, 
                top: `${ballPos.y}%`
              }}
            >
              <div className="absolute inset-0 rounded-full border-2 border-black/10 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 初始位置参考 (Ghost Balls) */}
        {showGhostBalls && (gameState === 'predicting' || gameState === 'result') && trajectoryPath.length > 0 && (
          <>
            {/* 起点 (进入画面处) */}
            {(() => {
              const startPoint = trajectoryPath.find(p => p.y >= 0);
              return startPoint && (
                <div 
                  className="absolute w-12 h-12 border-2 border-dashed border-white/20 rounded-full z-10"
                  style={{ 
                    left: `${startPoint.x}%`, 
                    top: `${startPoint.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/20 uppercase">Start</div>
                </div>
              );
            })()}
            
            {/* 消失点 (30% 处) */}
            {(() => {
              // 找到第一个达到消失阈值的点
              const hidePoint = trajectoryPath.find(p => p.y >= HIDE_THRESHOLD_Y);
              return hidePoint && (
                <div 
                  className="absolute w-12 h-12 border-2 border-dashed border-white/20 rounded-full z-10"
                  style={{ 
                    left: `${hidePoint.x}%`, 
                    top: `${hidePoint.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/20 uppercase">Hide</div>
                </div>
              );
            })()}
          </>
        )}

        {/* 预测时的引导提示 */}
        {gameState === 'predicting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-600/90 backdrop-blur-md px-8 py-4 rounded-3xl border border-blue-400/30 shadow-2xl text-center"
            >
              <Zap className="mx-auto mb-2 text-tennis-ball animate-pulse" />
              <p className="text-white font-black italic text-xl">球去哪了？</p>
              <p className="text-blue-100/70 text-sm mt-1">点击蓝色横线上你预判的落点</p>
            </motion.div>
          </div>
        )}

        {/* 结果显示 */}
        {gameState === 'result' && (
          <>
            {/* 完整路径 - 修复坐标映射 */}
            <svg 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            >
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                d={`M ${trajectoryPath.map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')}`}
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(223, 255, 0, 0.1)" />
                  <stop offset="30%" stopColor="rgba(223, 255, 0, 0.4)" />
                  <stop offset="100%" stopColor="rgba(223, 255, 0, 1)" />
                </linearGradient>
              </defs>
            </svg>

            {/* 你的点击位置 */}
            <div 
              className="absolute w-10 h-10 border-2 border-white rounded-full flex items-center justify-center z-30 -translate-x-1/2 -translate-y-1/2"
              style={{ 
                left: `${userGuessX}%`, 
                top: `${TARGET_LINE_Y}%`
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
              <div className="absolute -bottom-8 whitespace-nowrap text-[10px] font-bold text-white uppercase">你的预判</div>
            </div>

            {/* 真实落点 */}
            <motion.div 
              initial={{ scale: 0, x: "-50%", y: "-50%" }}
              animate={{ scale: 1.2, x: "-50%", y: "-50%" }}
              className="absolute w-12 h-12 bg-tennis-ball rounded-full shadow-[0_0_40px_rgba(223,255,0,0.8)] z-20 flex items-center justify-center"
              style={{ 
                left: `${targetPos.x}%`, 
                top: `${targetPos.y}%`
              }}
            >
              <TargetIcon size={24} className="text-black/40" />
              <div className="absolute -bottom-8 whitespace-nowrap text-[10px] font-bold text-tennis-ball uppercase">实际落点</div>
            </motion.div>

            {/* 连接线 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <line 
                x1={`${userGuessX}%`} y1={`${TARGET_LINE_Y}%`} 
                x2={`${targetPos.x}%`} y2={`${targetPos.y}%`} 
                stroke="white" strokeWidth="2" strokeDasharray="4 4" className="opacity-30"
              />
            </svg>
          </>
        )}

        {/* 结算弹窗 */}
        {gameState === 'result' && (
          <div className="absolute inset-x-0 top-24 flex justify-center z-50 px-6">
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-slate-800/90 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 shadow-2xl text-center w-full max-w-[320px]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <div className="text-4xl font-black text-white italic line-height-1">
                    {score}
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${score >= 90 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {score >= 95 ? '神级预判！' : score >= 85 ? '专业水准' : score >= 70 ? '基本吻合' : '继续观察'}
                  </p>
                </div>
                <button
                  onPointerDown={(e) => { e.stopPropagation(); startRound(); }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm italic transition-transform active:scale-95 shadow-lg shadow-blue-900/40"
                >
                  再来一球
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 准备开始 */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-[100] p-8">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20">
              <TargetIcon size={40} className="text-white" />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 italic text-center">轨迹预测训练</h3>
            <p className="text-slate-400 mb-12 text-center leading-relaxed max-w-[260px]">
              观察网球运动的一小段轨迹，预判它最终触碰 <span className="text-blue-400 font-bold">蓝色目标线</span> 的位置。
            </p>
            <button
              onPointerDown={(e) => { e.stopPropagation(); startRound(); }}
              className="px-16 py-5 bg-blue-600 text-white rounded-2xl font-black text-2xl italic tracking-widest shadow-2xl shadow-blue-500/30 transition-transform active:scale-95"
            >
              START
            </button>
          </div>
        )}
      </main>

      <footer className="p-8 bg-slate-900 border-t border-slate-800 text-center">
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em]">观察轨迹 • 预判落点</p>
      </footer>
    </div>
  );
};

export default TrajectoryGame;
