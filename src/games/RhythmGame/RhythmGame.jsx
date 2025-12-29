import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Settings, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLoop } from '../../hooks/useGameLoop';

const BALL_SPEED = 0.45; 
const HIT_ZONE_Y = 80; 
const HIT_THRESHOLD = 10; // 统一判定极限为 10%

const RhythmGame = ({ onBack }) => {
  const [balls, setBalls] = useState([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [gameState, setGameState] = useState('ready'); 
  const [hitEffect, setHitEffect] = useState(null); 
  const [showZones, setShowZones] = useState(false); // 判定辅助
  const [pauseOnHit, setPauseOnHit] = useState(false); // 击球后暂停
  const [isPaused, setIsPaused] = useState(false); // 当前是否处于暂停状态
  const [capturedBallId, setCapturedBallId] = useState(null); // 记录暂停时的那个球
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 设置菜单开关
  const containerRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);

  const startGame = () => {
    setBalls([]);
    setScore(0);
    scoreRef.current = 0;
    setGameState('playing');
    setIsSettingsOpen(false); // 开始游戏时关闭设置
    lastSpawnRef.current = performance.now();
  };

  const spawnBall = useCallback(() => {
    // 只有在屏幕上没球时才生成新球，确保单球回合制
    setBalls([{
      id: Math.random().toString(36).substr(2, 9),
      y: -10,
    }]);
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

    // 视觉特效
    setHitEffect({ type, id });
    setFeedback({ text: config.text, colorClass: config.color, id });

    // 触觉反馈 (震动)
    if (window.navigator.vibrate) {
      window.navigator.vibrate(config.vibe);
    }

    // 自动清除
    setTimeout(() => {
      setHitEffect(prev => prev?.id === id ? null : prev);
      setFeedback(prev => prev?.id === id ? null : prev);
    }, 600);
  }, []);

  useGameLoop((deltaTime) => {
    if (gameState !== 'playing' || isPaused) return;

    const now = performance.now();
    
    // 生成逻辑：如果屏幕没球，且距离上次操作/消失已过 1.2 秒
    if (balls.length === 0 && now - lastSpawnRef.current > 1200) {
      spawnBall();
      lastSpawnRef.current = now;
    }

    // 更新位置 (球掉出底线时直接移除)
    setBalls(prev => {
      if (prev.length === 0) return prev;

      const updated = prev.map(ball => ({
        ...ball,
        y: ball.y + (BALL_SPEED * deltaTime) / 6,
      })).filter(ball => {
        if (ball.y > 105) {
          // 球掉出底线，重置计时器，准备下一球
          lastSpawnRef.current = performance.now();
          return false;
        }
        return true;
      });

      return updated;
    });
  });

  const handleHit = () => {
    // 如果设置菜单开启，点击屏幕时先关闭菜单
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return;
    }

    // 记录本次操作时间，作为下一次出球的基准（无论暂停、击中还是 Miss）
    const hitTime = performance.now();
    lastSpawnRef.current = hitTime;

    // 如果当前是暂停状态，点击任意位置继续，并移除那个球
    if (isPaused) {
      setIsPaused(false);
      if (capturedBallId) {
        setBalls(prev => prev.filter(b => b.id !== capturedBallId));
        setCapturedBallId(null);
      }
      return;
    }

    if (gameState !== 'playing') return;

    // 1. 立即获取当前的球列表进行判定（不依赖下一次渲染）
    // 注意：由于 balls 是状态，这里拿到的是当前闭包中的 balls
    // 为了极致性能，我们可以通过计算来判定
    
    let closestIdx = -1;
    let minDistance = Infinity;
    let closestBall = null;

    balls.forEach((ball, idx) => {
      const dist = Math.abs(ball.y - HIT_ZONE_Y);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
        closestBall = ball;
      }
    });

    // 2. 判定逻辑 (对齐视觉：PERFECT 为 2%, GREAT 为 2-6%, GOOD 为 6-10%)
    if (closestIdx !== -1 && minDistance < HIT_THRESHOLD) {
      const dist = minDistance;
      let points = 0;
      let type = '';

      if (dist < 2) {
        points = 100;
        type = 'PERFECT';
      } else if (dist < 6) {
        points = 50;
        type = 'GREAT';
      } else {
        points = 20;
        type = 'GOOD';
      }

      // 3. 立即更新分数和反馈（同步触发渲染）
      scoreRef.current += points;
      setScore(scoreRef.current);
      triggerFeedback(type);

      // 如果开启了击球后暂停
      if (pauseOnHit) {
        setIsPaused(true);
        setCapturedBallId(closestBall.id);
      } else {
        setBalls(prev => prev.filter(b => b.id !== closestBall.id));
      }
    } else {
      // 没击中
      triggerFeedback('MISS');
      
      // MISS 时也需要暂停复盘
      if (pauseOnHit && closestBall) {
        setIsPaused(true);
        setCapturedBallId(closestBall.id);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 select-none">
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-emerald-900/20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400">
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-bold italic tracking-tight text-white">节奏专家</h2>
        </div>
        
        <div className="flex items-center gap-4 relative">
          {/* 设置按钮 */}
          <button 
            onPointerDown={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
            className={`p-2 rounded-xl border transition-all ${
              isSettingsOpen ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Settings size={20} className={isSettingsOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
          </button>

          {/* 设置下拉菜单 */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[100] overflow-hidden p-2"
              >
                <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700/50 mb-1">
                  训练设置
                </div>
                
                {/* 选项 1: 判定辅助 */}
                <button
                  onPointerDown={(e) => { e.stopPropagation(); setShowZones(!showZones); }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${showZones ? 'bg-tennis-ball/20 text-tennis-ball' : 'bg-slate-900 text-slate-600'}`}>
                      {showZones ? <Eye size={16} /> : <EyeOff size={16} />}
                    </div>
                    <span className="text-sm font-medium text-slate-200">判定辅助区</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${showZones ? 'bg-tennis-ball' : 'bg-slate-600'}`}>
                    <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${showZones ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>

                {/* 选项 2: 击球后暂停 */}
                <button
                  onPointerDown={(e) => { e.stopPropagation(); setPauseOnHit(!pauseOnHit); }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${pauseOnHit ? 'bg-tennis-ball/20 text-tennis-ball' : 'bg-slate-900 text-slate-600'}`}>
                      <RefreshCw size={16} />
                    </div>
                    <span className="text-sm font-medium text-slate-200">击球后暂停</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${pauseOnHit ? 'bg-tennis-ball' : 'bg-slate-600'}`}>
                    <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${pauseOnHit ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>

                {/* 可以在这里添加更多选项，例如音效、难度等 */}
                <div className="p-3 text-[10px] text-slate-600 italic">
                  更多设置项开发中...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="text-3xl font-mono font-black text-tennis-ball italic">
            {score.toString().padStart(5, '0')}
          </div>
        </div>
      </header>

      <main 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden cursor-crosshair transition-colors duration-100 touch-none ${
          hitEffect?.type === 'PERFECT' ? 'bg-yellow-500/10' : 
          hitEffect?.type === 'MISS' ? 'bg-red-500/10' : 'bg-slate-900'
        }`}
        onPointerDown={handleHit}
      >
        {/* 背景局部脉冲效果 (对齐击球区) */}
        <AnimatePresence>
          {hitEffect && (
            <motion.div
              initial={{ opacity: 0.6, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ top: `${HIT_ZONE_Y}%` }}
              className={`absolute left-0 right-0 h-32 -translate-y-1/2 pointer-events-none z-0 blur-3xl ${
                hitEffect.type === 'PERFECT' ? 'bg-yellow-400/30' :
                hitEffect.type === 'GREAT' ? 'bg-green-400/20' :
                hitEffect.type === 'GOOD' ? 'bg-blue-400/15' : 'bg-red-500/25'
              }`}
            />
          )}
        </AnimatePresence>

        {/* 判定区引导系统 (修正高度继承问题) */}
        <div 
          className="absolute inset-x-0 inset-y-0 pointer-events-none z-10"
        >
          {/* 中心基准线 */}
          <div 
            className="absolute left-0 right-0 h-[2px] bg-white/20"
            style={{ top: `${HIT_ZONE_Y}%` }}
          />

          {/* 辅助显示模式：层层叠叠的判定区 (高度现在严格对应判定逻辑) */}
          {showZones ? (
            <div className="absolute inset-0">
              {/* GOOD 区域 (±10%) -> 总高度 20% */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] border-2 border-blue-500/30 rounded-full bg-blue-500/5" 
                style={{ top: `${HIT_ZONE_Y}%`, height: `${HIT_THRESHOLD * 2}%` }}
              />
              {/* GREAT 区域 (±6%) -> 总高度 12% */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[82%] border-2 border-green-500/40 rounded-full bg-green-500/5" 
                style={{ top: `${HIT_ZONE_Y}%`, height: `${6 * 2}%` }}
              />
              {/* PERFECT 区域 (±2%) -> 总高度 4% */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72%] border-2 border-yellow-400/50 rounded-full bg-yellow-400/10 shadow-[0_0_25px_rgba(250,204,21,0.2)]" 
                style={{ top: `${HIT_ZONE_Y}%`, height: `${2 * 2}%` }}
              />
            </div>
          ) : (
            /* 普通模式：单一简洁的虚线圈 */
            <motion.div 
              style={{ top: `${HIT_ZONE_Y}%` }}
              animate={hitEffect ? { opacity: [0.3, 0.8, 0.3] } : {}}
              transition={{ duration: 0.2 }}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-20 border-[3px] border-dashed border-white/20 rounded-full" 
            />
          )}
          
          {/* 命中时的中心发光 (对齐基准线) */}
          <AnimatePresence>
            {hitEffect && hitEffect.type !== 'MISS' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.5, scale: 1.2 }}
                exit={{ opacity: 0 }}
                style={{ top: `${HIT_ZONE_Y}%` }}
                className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-12 rounded-full blur-3xl pointer-events-none ${
                  hitEffect.type === 'PERFECT' ? 'bg-yellow-400' :
                  hitEffect.type === 'GREAT' ? 'bg-green-400' : 'bg-blue-400'
                }`}
              />
            )}
          </AnimatePresence>
        </div>

        {/* 掉落的网球 - 增强网球质感 */}
        <AnimatePresence>
          {balls.map(ball => (
            <motion.div
              key={ball.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full z-20"
              style={{ 
                top: `${ball.y}%`,
                background: `radial-gradient(circle at 35% 35%, #dfff00 0%, #c2e600 50%, #a2c100 100%)`,
                boxShadow: `
                  inset -6px -6px 12px rgba(0,0,0,0.3),
                  inset 6px 6px 12px rgba(255,255,255,0.4),
                  0 0 25px rgba(204,255,0,0.3)
                `
              }}
            >
              {/* 真实的网球 S 型缝合线 - 扩展至球体边缘 */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                {/* 缝隙深色底层 */}
                <path 
                  d="M 5,50 C 5,10 50,10 50,50 C 50,90 95,90 95,50" 
                  fill="none" 
                  stroke="rgba(0,0,0,0.25)" 
                  strokeWidth="9" 
                  strokeLinecap="round"
                  transform="rotate(-15 50 50)"
                />
                {/* 主 S 型白色缝线 - 延伸至边缘 */}
                <path 
                  d="M 5,50 C 5,10 50,10 50,50 C 50,90 95,90 95,50" 
                  fill="none" 
                  stroke="#f5f5f5" 
                  strokeWidth="6" 
                  strokeLinecap="round"
                  className="opacity-90"
                  transform="rotate(-15 50 50)"
                />
              </svg>
              
              {/* 绒毛质感覆盖层 */}
              <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-20" />

              {/* 辅助模式下的球心标记 */}
              {showZones && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,1)] z-30" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 反馈文字 (对齐击球区) */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              key={feedback.id}
              initial={{ opacity: 0, scale: 0.3, y: 0 }}
              animate={{ opacity: 1, scale: 1.2, y: -140 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ 
                type: "spring", 
                stiffness: 600, 
                damping: 25,
                mass: 0.5
              }}
              style={{ top: `${HIT_ZONE_Y}%` }}
              className={`absolute left-0 right-0 text-center -translate-y-1/2 text-6xl font-black italic tracking-tighter ${feedback.colorClass} drop-shadow-[0_0_15px_rgba(0,0,0,0.6)] pointer-events-none z-50`}
            >
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 准备界面/暂停提示 */}
        {(gameState === 'ready' || isPaused) && (
          <div className={`absolute inset-0 flex flex-col items-center p-8 text-center z-50 transition-all ${
            isPaused ? 'bg-black/10' : 'bg-black/70 backdrop-blur-sm justify-center'
          }`}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              {isPaused ? (
                <div className="mt-10 bg-black/40 border border-white/10 px-6 py-3 rounded-full backdrop-blur-md">
                  <h3 className="text-xl font-black text-tennis-ball italic flex items-center gap-2">
                    <RefreshCw size={18} className="animate-spin" /> PAUSED
                  </h3>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">
                    点击屏幕任何位置继续
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-4xl font-black text-white mb-2 italic">READY?</h3>
                  <p className="text-slate-400 mb-10 max-w-[240px] mx-auto leading-relaxed">
                    当网球经过下方的虚线圆圈时，点击屏幕任意位置击球！
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onPointerDown={(e) => { e.stopPropagation(); startGame(); }}
                    className="px-16 py-5 bg-tennis-ball text-black rounded-2xl font-black text-2xl italic tracking-widest shadow-2xl shadow-tennis-ball/30"
                  >
                    开始
                  </motion.button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </main>

      <footer className="p-8 bg-slate-900 border-t border-slate-800 text-center">
        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.4em] animate-pulse">
          点击屏幕击球
        </p>
      </footer>
    </div>
  );
};

export default RhythmGame;
