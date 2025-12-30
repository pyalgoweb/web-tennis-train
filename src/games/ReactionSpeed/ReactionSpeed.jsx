import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, RefreshCw, Trophy, Settings, Eye, Split, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  const timerRef = useRef(null);
  const mainRef = useRef(null);

  const startTest = () => {
    setGameState('waiting');
    setReactionTime(null);
    setClickedSide(null);
    setClickLocation(null);
    
    // 如果是分屏模式，随机选择一边
    if (isSplitMode) {
      setTargetSide(Math.random() > 0.5 ? 'right' : 'left');
    } else {
      setTargetSide(null);
    }
    
    // 随机等待 2-5 秒
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

    // 记录点击位置
    if (mainRef.current) {
      const rect = mainRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setClickLocation({ 
        x: (x / rect.width) * 100, 
        y: (y / rect.height) * 100 
      });
    }

    if (gameState === 'waiting') {
      // 太早了！
      clearTimeout(timerRef.current);
      setReactionTime(0);
      setGameState('result');
      if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
    } else if (gameState === 'active') {
      const endTime = performance.now();
      const time = Math.round(endTime - startTime);
      
      // 检测点击的是哪一边
      if (mainRef.current) {
        const rect = mainRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const side = x < rect.width / 2 ? 'left' : 'right';
        setClickedSide(side);
      }

      setReactionTime(time);
      setGameState('result');
      
      // 只有在普通模式或分屏模式点对时才更新最高分
      const isCorrect = !isSplitMode || (targetSide === (e.clientX < window.innerWidth / 2 ? 'left' : 'right'));
      
      if (isCorrect && (!bestTime || time < bestTime)) {
        setBestTime(time);
        localStorage.setItem('tennis_best_reaction', time);
      }
      
      if (window.navigator.vibrate) {
        window.navigator.vibrate(isCorrect ? 20 : [50, 50, 50]);
      }
    }
  };

  const getRating = (time) => {
    if (time < 200) return { text: '顶级职业选手', color: 'text-yellow-400' };
    if (time < 250) return { text: '专业水准', color: 'text-green-400' };
    if (time < 300) return { text: '优秀', color: 'text-blue-400' };
    return { text: '继续努力', color: 'text-slate-400' };
  };

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden select-none touch-none bg-slate-950">
      <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 z-[60]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400">
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-bold italic tracking-tight text-white">反应测试</h2>
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
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }} 
                className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[100] p-2"
              >
                <button 
                  onPointerDown={(e) => { e.stopPropagation(); setIsSplitMode(!isSplitMode); }} 
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <Split size={16} />
                    <span className="text-sm">左右侧反应模式</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative ${isSplitMode ? 'bg-tennis-ball' : 'bg-slate-600'}`}>
                    <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${isSplitMode ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
                <button 
                  onPointerDown={(e) => { e.stopPropagation(); setShowClickPos(!showClickPos); }} 
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <MousePointer2 size={16} />
                    <span className="text-sm">显示点击位置</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative ${showClickPos ? 'bg-tennis-ball' : 'bg-slate-600'}`}>
                    <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${showClickPos ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {bestTime && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-tennis-ball bg-tennis-ball/10 px-3 py-1 rounded-full border border-tennis-ball/20">
              <Trophy size={14} />
              BEST: {bestTime}ms
            </div>
          )}
        </div>
      </header>

      <main 
        ref={mainRef}
        onPointerDown={handlePointerDown}
        className="flex-1 relative flex flex-col items-center justify-center overflow-hidden transition-colors duration-75 bg-slate-950"
      >
        {/* 背景颜色层 */}
        <div className="absolute inset-0 flex">
          <div 
            className={`flex-1 transition-colors duration-75 ${
              gameState === 'active' && (!isSplitMode || targetSide === 'left') ? 'bg-tennis-ball' : 
              gameState === 'waiting' ? 'bg-red-900/20' : 'bg-transparent'
            }`}
          />
          {isSplitMode && (
            <div className="w-px bg-white/10 h-full z-10" />
          )}
          <div 
            className={`flex-1 transition-colors duration-75 ${
              gameState === 'active' && (!isSplitMode || targetSide === 'right') ? 'bg-tennis-ball' : 
              gameState === 'waiting' ? 'bg-red-900/20' : 'bg-transparent'
            }`}
          />
        </div>

        {/* 点击位置标记 */}
        {gameState === 'result' && showClickPos && clickLocation && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{ 
              left: `${clickLocation.x}%`, 
              top: `${clickLocation.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-10 h-10 border-2 border-white rounded-full flex items-center justify-center"
            >
              <div className="w-2 h-2 bg-white rounded-full" />
              <div className="absolute inset-0 animate-ping rounded-full border border-white/50" />
            </motion.div>
          </div>
        )}

        {/* 内容层 */}
        <div className="relative z-20 w-full h-full flex items-center justify-center">
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
                  {isSplitMode ? (
                    <>点击开始，当某侧变为 <span className="text-tennis-ball font-bold italic">荧光绿</span> 时，点击该侧区域！</>
                  ) : (
                    <>点击屏幕开始，当屏幕变为 <span className="text-tennis-ball font-bold italic">荧光绿</span> 时，以最快速度点击！</>
                  )}
                </p>
                <button
                  onPointerDown={(e) => { e.stopPropagation(); startTest(); }}
                  className="px-16 py-5 bg-tennis-ball text-black rounded-2xl font-black text-2xl italic tracking-widest shadow-2xl shadow-tennis-ball/30"
                >
                  START
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
                <p className={`text-6xl font-black italic uppercase tracking-tighter ${isSplitMode ? 'text-white drop-shadow-lg' : 'text-black'}`}>
                  {isSplitMode ? (targetSide === 'left' ? '← 点击左侧' : '点击右侧 →') : '现在点击！'}
                </p>
              </motion.div>
            )}

            {gameState === 'result' && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-8 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[40px] shadow-2xl mx-6 max-w-sm w-full"
              >
                <div className="flex justify-center mb-4">
                  {reactionTime === 0 ? (
                    <div className="px-4 py-1 rounded-full text-xs font-black italic uppercase tracking-widest bg-red-500/20 text-red-400">
                      抢跑！太快了
                    </div>
                  ) : isSplitMode && (
                    <div className={`px-4 py-1 rounded-full text-xs font-black italic uppercase tracking-widest ${
                      clickedSide === targetSide ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {clickedSide === targetSide ? '侧向正确' : '点击错误'}
                    </div>
                  )}
                </div>

                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2">你的反应时间</h3>
                <div className={`text-7xl font-mono font-black mb-4 italic tracking-tighter ${reactionTime === 0 ? 'text-red-500' : 'text-white'}`}>
                  {reactionTime === 0 ? 'TOO EARLY' : <>{reactionTime}<span className="text-2xl ml-1">ms</span></>}
                </div>
                
                <div className={`text-xl font-bold mb-10 ${
                  reactionTime === 0 ? 'text-red-400' : (isSplitMode && clickedSide !== targetSide ? 'text-red-500' : getRating(reactionTime).color)
                }`}>
                  {reactionTime === 0 ? '请在变色后点击' : (isSplitMode && clickedSide !== targetSide ? '需要点对正确区域！' : getRating(reactionTime).text)}
                </div>

                <button
                  onPointerDown={(e) => { e.stopPropagation(); startTest(); }}
                  className="w-full flex items-center justify-center gap-3 px-10 py-5 bg-tennis-ball text-black rounded-2xl font-black text-xl italic transition-transform active:scale-95 shadow-xl shadow-tennis-ball/20"
                >
                  <RefreshCw size={24} />
                  再次测试
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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

