import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Target as TargetIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLoop } from '../../hooks/useGameLoop';

const TrajectoryGame = ({ onBack }) => {
  const [gameState, setGameState] = useState('ready'); // ready, flying, predicting, result
  const [ballPos, setBallPos] = useState({ x: 50, y: -10 });
  const [targetPos, setTargetPos] = useState(null);
  const [userGuess, setUserGuess] = useState(null);
  const [score, setScore] = useState(null);
  const containerRef = useRef(null);
  
  // 物理参数
  const physicsRef = useRef({
    vx: 0,
    vy: 0,
    gravity: 0.12,
    bounce: -0.75,
  });

  const startRound = () => {
    const startX = 20 + Math.random() * 60;
    const vx = (Math.random() - 0.5) * 1.5;
    const vy = 1.5 + Math.random() * 1.5;

    setBallPos({ x: startX, y: -10 });
    physicsRef.current.vx = vx;
    physicsRef.current.vy = vy;
    
    setUserGuess(null);
    setScore(null);
    setTargetPos(null);
    setGameState('flying');
  };

  const calculateTarget = useCallback((x, y, vx, vy) => {
    let tx = x;
    let ty = y;
    let tvx = vx;
    let tvy = vy;
    
    // 模拟直到球再次到达高点或经过一段时间
    for (let i = 0; i < 30; i++) {
      tvy += physicsRef.current.gravity;
      tx += tvx;
      ty += tvy;
      if (tx < 5 || tx > 95) tvx *= -1;
    }
    setTargetPos({ x: tx, y: ty });
  }, []);

  useGameLoop((deltaTime) => {
    if (gameState !== 'flying') return;

    physicsRef.current.vy += physicsRef.current.gravity;
    
    setBallPos(prev => {
      let newX = prev.x + physicsRef.current.vx;
      let newY = prev.y + physicsRef.current.vy;

      // 地面碰撞判定
      if (newY >= 75) {
        newY = 75;
        const finalVx = physicsRef.current.vx;
        const finalVy = physicsRef.current.vy * physicsRef.current.bounce;
        
        // 这里的异步转换避免了 React 渲染冲突
        setTimeout(() => {
          setGameState('predicting');
          calculateTarget(newX, newY, finalVx, finalVy);
        }, 0);
        
        return { x: newX, y: newY };
      }

      return { x: newX, y: newY };
    });
  });

  const handleGuess = (e) => {
    if (gameState !== 'predicting') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setUserGuess({ x, y });
    
    const dx = x - targetPos.x;
    const dy = y - targetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const roundScore = Math.max(0, Math.round(100 - dist * 4));
    setScore(roundScore);
    setGameState('result');
    
    // 触觉反馈
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 select-none">
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-blue-900/20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400">
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-bold italic">弹道预测</h2>
        </div>
        {score !== null && (
          <div className="text-2xl font-mono font-bold text-blue-400">
            {score.toString().padStart(3, '0')}
          </div>
        )}
      </header>

      <main 
        ref={containerRef}
        className="flex-1 relative bg-slate-900 overflow-hidden"
        onClick={handleGuess}
      >
        {/* 球场装饰线 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <div className="w-full h-[2px] bg-white" />
          <div className="h-full w-[2px] bg-white" />
        </div>

        {/* 击地水平线 */}
        <div className="absolute top-[75%] left-0 right-0 h-px bg-white/20 border-t border-dashed border-white/40" />

        {/* 网球 */}
        {(gameState !== 'ready') && (
          <motion.div
            className="absolute w-10 h-10 bg-tennis-ball rounded-full shadow-[0_0_20px_rgba(225,255,0,0.6)] z-20"
            animate={{ scale: gameState === 'predicting' ? [1, 1.1, 1] : 1 }}
            transition={{ repeat: gameState === 'predicting' ? Infinity : 0, duration: 0.5 }}
            style={{ 
              left: `${ballPos.x}%`, 
              top: `${ballPos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-full h-full rounded-full border-t-2 border-black/10 rotate-45" />
          </motion.div>
        )}

        {/* 用户预测标记 */}
        {userGuess && (
          <div 
            className="absolute w-8 h-8 border-2 border-white rounded-full flex items-center justify-center z-30"
            style={{ 
              left: `${userGuess.x}%`, 
              top: `${userGuess.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}

        {/* 实际目标标记 */}
        {gameState === 'result' && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute w-12 h-12 border-2 border-tennis-ball rounded-full flex items-center justify-center z-10"
            style={{ 
              left: `${targetPos.x}%`, 
              top: `${targetPos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <TargetIcon size={24} className="text-tennis-ball" />
          </motion.div>
        )}

        {/* 状态文字提示 */}
        <div className="absolute top-10 left-0 right-0 text-center pointer-events-none px-6 z-40">
          <AnimatePresence mode="wait">
            {gameState === 'ready' && (
              <motion.p key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-500 font-bold uppercase tracking-widest">
                观察落点，预测反弹位置
              </motion.p>
            )}
            {gameState === 'predicting' && (
              <motion.div key="predict" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-blue-600 px-6 py-2 rounded-full inline-block shadow-lg">
                <p className="text-white font-black italic">点击预测点！</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 结算弹窗 */}
        {gameState === 'result' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center"
            >
              <h3 className="text-3xl font-black text-white mb-1 uppercase italic">
                {score >= 90 ? '完美!' : score >= 70 ? '优秀!' : '加油!'}
              </h3>
              <p className="text-slate-400 mb-6">本次预测得分: <span className="text-tennis-ball font-mono text-xl">{score}</span></p>
              <button
                onClick={(e) => { e.stopPropagation(); startRound(); }}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/40"
              >
                <RefreshCw size={20} />
                再练一球
              </button>
            </motion.div>
          </div>
        )}

        {/* 初始开始按钮 */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center z-40">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); startRound(); }}
              className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-xl italic tracking-widest shadow-2xl shadow-blue-900/50"
            >
              开始训练
            </motion.button>
          </div>
        )}
      </main>

      <footer className="p-6 bg-slate-900 flex justify-center border-t border-slate-800">
        <div className="flex gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-white" /> 你的预判</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-tennis-ball" /> 真实轨迹</span>
        </div>
      </footer>
    </div>
  );
};

export default TrajectoryGame;
