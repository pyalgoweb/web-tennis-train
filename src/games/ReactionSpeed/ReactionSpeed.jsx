import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, RefreshCw, Trophy, Settings, Split, MousePointer2, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TARGET_RATIO = 9 / 16;

const ReactionSpeed = ({ onBack }) => {
  const [gameState, setGameState] = useState('ready'); // ready, waiting, active, result
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(null);
  const [bestTime, setBestTime] = useState(() => {
    return localStorage.getItem('tennis_best_reaction') || null;
  });
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [showClickPos, setShowClickPos] = useState(false);
  const [clickLocation, setClickLocation] = useState(null);
  const [targetSide, setTargetSide] = useState(null); // 'left' or 'right'
  const [clickedSide, setClickedSide] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFixedRatio, setIsFixedRatio] = useState(true); // 默认开启固定比例
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0, unit: 1 });
  
  const timerRef = useRef(null);
  const outerContainerRef = useRef(null);
  const arenaRef = useRef(null);

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

  const startTest = () => {
    setGameState('waiting');
    setReactionTime(null);
    setClickedSide(null);
    setClickLocation(null);
    
    if (isSplitMode) {
      setTargetSide(Math.random() > 0.5 ? 'right' : 'left');
    } else {
      setTargetSide(null);
    }
    
    const waitTime = 2000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setGameState('active');
      setStartTime(performance.now());
    }, waitTime);
  };

  const handlePointerDown = (e) => {
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return;
    }

    // 记录相对于竞技场的点击位置
    if (arenaRef.current) {
      const rect = arenaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 只有在竞技场范围内点击才有效（如果开启了固定比例且有黑边）
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      setClickLocation({ 
        x: (x / rect.width) * 100, 
        y: (y / rect.height) * 100 
      });

      if (gameState === 'waiting') {
        clearTimeout(timerRef.current);
        setReactionTime(0);
        setGameState('result');
        if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
      } else if (gameState === 'active') {
        const endTime = performance.now();
        const time = Math.round(endTime - startTime);
        
        const side = x < rect.width / 2 ? 'left' : 'right';
        setClickedSide(side);
        setReactionTime(time);
        setGameState('result');
        
        const isCorrect = !isSplitMode || (targetSide === side);
        if (isCorrect && (!bestTime || time < bestTime)) {
          setBestTime(time);
          localStorage.setItem('tennis_best_reaction', time);
        }
        
        if (window.navigator.vibrate) {
          window.navigator.vibrate(isCorrect ? 20 : [50, 50, 50]);
        }
      }
    }
  };

  const getRating = (time) => {
    if (time < 200) return { text: '顶级职业选手', color: 'text-yellow-400' };
    if (time < 250) return { text: '专业水准', color: 'text-green-400' };
    if (time < 300) return { text: '优秀', color: 'text-blue-400' };
    return { text: '继续努力', color: 'text-slate-400' };
  };

  const u = arenaSize.unit;

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden select-none touch-none bg-black">
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 z-[60] shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ArrowLeft /></button>
          <h2 className="text-xl font-bold italic text-white">反应测试</h2>
        </div>
        
        <div className="flex items-center gap-4 relative">
          <button onPointerDown={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
            className={`p-2 rounded-xl border transition-all ${isSettingsOpen ? 'bg-slate-700 border-slate-600' : 'bg-slate-800 border-slate-700'}`}>
            <Settings size={20} className={isSettingsOpen ? 'rotate-90' : ''} />
          </button>

          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[100] p-2">
                <button onPointerDown={(e) => { e.stopPropagation(); setIsSplitMode(!isSplitMode); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><Split size={16} /><span className="text-sm">左右侧反应模式</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${isSplitMode ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isSplitMode ? 'right-1' : 'left-1'}`} /></div>
                </button>
                <button onPointerDown={(e) => { e.stopPropagation(); setShowClickPos(!showClickPos); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><MousePointer2 size={16} /><span className="text-sm">显示点击位置</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${showClickPos ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${showClickPos ? 'right-1' : 'left-1'}`} /></div>
                </button>
                <button onPointerDown={(e) => { e.stopPropagation(); setIsFixedRatio(!isFixedRatio); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50">
                  <div className="flex items-center gap-3"><Layout size={16} /><span className="text-sm">竞技场比例 (9:16)</span></div>
                  <div className={`w-8 h-4 rounded-full relative ${isFixedRatio ? 'bg-tennis-ball' : 'bg-slate-600'}`}><div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isFixedRatio ? 'right-1' : 'left-1'}`} /></div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {bestTime && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-tennis-ball bg-tennis-ball/10 px-3 py-1 rounded-full border border-tennis-ball/20">
              <Trophy size={14} /> BEST: {bestTime}ms
            </div>
          )}
        </div>
      </header>

      <div ref={outerContainerRef} className="flex-1 flex items-start justify-center bg-black overflow-hidden">
        <main ref={arenaRef} onPointerDown={handlePointerDown}
          className={`relative overflow-hidden transition-colors duration-75 shrink-0 ${isFixedRatio ? 'border-x border-white/10' : ''} bg-slate-950`}
          style={{ width: arenaSize.width || '100%', height: arenaSize.height || '100%' }}>
          
          <div className="absolute inset-0 flex">
            <div className={`flex-1 transition-colors duration-75 ${gameState === 'active' && (!isSplitMode || targetSide === 'left') ? 'bg-tennis-ball' : gameState === 'waiting' ? 'bg-red-900/10' : 'bg-transparent'}`} />
            {isSplitMode && <div className="w-px bg-white/10 h-full z-10" />}
            <div className={`flex-1 transition-colors duration-75 ${gameState === 'active' && (!isSplitMode || targetSide === 'right') ? 'bg-tennis-ball' : gameState === 'waiting' ? 'bg-red-900/10' : 'bg-transparent'}`} />
          </div>

          {gameState === 'result' && showClickPos && clickLocation && (
            <div className="absolute z-30 pointer-events-none" style={{ left: `${clickLocation.x}%`, top: `${clickLocation.y}%`, transform: 'translate(-50%, -50%)' }}>
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="border-2 border-white rounded-full flex items-center justify-center" style={{ width: u * 10, height: u * 10 }}>
                <div className="w-2 h-2 bg-white rounded-full" />
                <div className="absolute inset-0 animate-ping rounded-full border border-white/50" />
              </motion.div>
            </div>
          )}

          <div className="relative z-20 w-full h-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              {gameState === 'ready' && (
                <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center p-8">
                  <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl flex items-center justify-center mb-8 mx-auto" style={{ width: u * 15, height: u * 15 }}>
                    <Zap size={u * 8} className="text-tennis-ball" />
                  </div>
                  <h3 className="font-black text-white mb-4 italic" style={{ fontSize: u * 5 }}>准备测试？</h3>
                  <p className="text-slate-400 mb-10 leading-relaxed mx-auto" style={{ fontSize: u * 2.2, maxWidth: u * 35 }}>
                    点击开始，当屏幕变为 <span className="text-tennis-ball font-bold italic">荧光绿</span> 时，以最快速度点击！
                  </p>
                  <button onPointerDown={(e) => { e.stopPropagation(); startTest(); }}
                    className="bg-tennis-ball text-black rounded-2xl font-black italic tracking-widest shadow-2xl shadow-tennis-ball/30"
                    style={{ padding: `${u * 2.5}px ${u * 10}px`, fontSize: u * 4 }}>
                    START
                  </button>
                </motion.div>
              )}

              {gameState === 'waiting' && (
                <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <p className="font-black text-white/20 italic uppercase tracking-[0.2em] animate-pulse" style={{ fontSize: u * 5 }}>等待变化...</p>
                </motion.div>
              )}

              {gameState === 'active' && (
                <motion.div key="active" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                  <p className={`font-black italic uppercase tracking-tighter ${isSplitMode ? 'text-white drop-shadow-lg' : 'text-black'}`} style={{ fontSize: u * 8 }}>
                    {isSplitMode ? (targetSide === 'left' ? '← 左侧' : '右侧 →') : '现在点击！'}
                  </p>
                </motion.div>
              )}

              {gameState === 'result' && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center p-8 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[40px] shadow-2xl mx-6 w-full"
                  style={{ maxWidth: u * 45 }}>
                  <div className="flex justify-center mb-4">
                    {reactionTime === 0 ? (
                      <div className="px-4 py-1 rounded-full text-xs font-black italic uppercase tracking-widest bg-red-500/20 text-red-400">抢跑！太快了</div>
                    ) : isSplitMode && (
                      <div className={`px-4 py-1 rounded-full text-xs font-black italic uppercase tracking-widest ${clickedSide === targetSide ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {clickedSide === targetSide ? '侧向正确' : '点击错误'}
                      </div>
                    )}
                  </div>
                  <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">你的反应时间</h3>
                  <div className={`font-mono font-black mb-4 italic tracking-tighter ${reactionTime === 0 ? 'text-red-500' : 'text-white'}`} style={{ fontSize: u * 10 }}>
                    {reactionTime === 0 ? 'EARLY' : <>{reactionTime}<span className="text-2xl ml-1">ms</span></>}
                  </div>
                  <div className={`font-bold mb-10 ${reactionTime === 0 ? 'text-red-400' : (isSplitMode && clickedSide !== targetSide ? 'text-red-500' : getRating(reactionTime).color)}`} style={{ fontSize: u * 3 }}>
                    {reactionTime === 0 ? '请在变色后点击' : (isSplitMode && clickedSide !== targetSide ? '需要点对正确区域！' : getRating(reactionTime).text)}
                  </div>
                  <button onPointerDown={(e) => { e.stopPropagation(); startTest(); }}
                    className="w-full flex items-center justify-center gap-3 bg-tennis-ball text-black rounded-2xl font-black italic transition-transform active:scale-95 shadow-xl shadow-tennis-ball/20"
                    style={{ padding: `${u * 2.5}px 0`, fontSize: u * 3.5 }}>
                    <RefreshCw size={u * 4} />再次测试
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <footer className="p-6 text-center bg-slate-950/50 shrink-0">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">强化你的神经传导速度</p>
      </footer>
    </div>
  );
};

export default ReactionSpeed;
