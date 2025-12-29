import React from 'react';
import { Play, Target, Music, Settings, Trophy, Zap, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

const GameCard = ({ title, description, icon: Icon, onClick, color, badge }) => (
  <motion.div
    whileHover={{ y: -5 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`p-6 rounded-3xl ${color} cursor-pointer flex flex-col justify-between h-52 shadow-xl overflow-hidden relative group border border-white/10`}
  >
    <div className="z-10">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-2xl font-black italic tracking-tight">{title}</h3>
        {badge && (
          <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm opacity-80 leading-snug max-w-[80%]">{description}</p>
    </div>
    <div className="flex justify-between items-end z-10">
      <div className="bg-black/20 p-2 rounded-xl backdrop-blur-sm">
        <Icon size={32} className="text-white" />
      </div>
      <div className="text-white/40 group-hover:text-white transition-colors">
        <Play size={24} fill="currentColor" />
      </div>
    </div>
    {/* 背景装饰 */}
    <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-all duration-500 transform group-hover:scale-110 group-hover:-rotate-12">
      <Icon size={160} />
    </div>
  </motion.div>
);

const Home = ({ onSelectGame }) => {
  return (
    <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full bg-slate-950 overflow-y-auto no-scrollbar">
      <header className="py-10 flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter mb-1 flex items-center gap-2">
            TENNIS<span className="text-tennis-ball">TRAIN</span>
          </h1>
          <div className="h-1 w-20 bg-tennis-ball rounded-full mb-4" />
          <p className="text-slate-400 font-medium">顶级网球选手的直觉强化工具</p>
        </div>
        <motion.div 
          whileTap={{ scale: 0.9 }}
          className="bg-slate-800 p-3 rounded-2xl border border-slate-700 shadow-lg"
        >
          <Trophy size={24} className="text-yellow-500" />
        </motion.div>
      </header>

      <main className="flex-1 space-y-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">每日训练计划</h2>
          <Zap size={14} className="text-tennis-ball" />
        </div>
        
        <div className="space-y-4">
          <GameCard
            title="节奏专家"
            description="模拟真实击球节奏，在甜点区瞬间完成反应训练。"
            icon={Music}
            color="bg-emerald-600"
            badge="热门"
            onClick={() => onSelectGame('rhythm')}
          />

          <GameCard
            title="弹道预测"
            description="基于物理引擎模拟，预判球反弹后的运行轨迹中心。"
            icon={Target}
            color="bg-blue-600"
            badge="进阶"
            onClick={() => onSelectGame('trajectory')}
          />

          <GameCard
            title="神经反应"
            description="看到颜色变化瞬间点击，测试你的神经反应速度（毫秒）。"
            icon={Zap}
            color="bg-amber-600"
            badge="基础"
            onClick={() => onSelectGame('reaction')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            whileTap={{ scale: 0.95 }}
            className="bg-slate-900 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border border-slate-800 shadow-lg"
          >
            <Settings size={20} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">系统设置</span>
          </motion.div>
          <motion.div 
            whileTap={{ scale: 0.95 }}
            className="bg-slate-900 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border border-slate-800 shadow-lg"
          >
            <Share2 size={20} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">分享成绩</span>
          </motion.div>
        </div>
      </main>

      <footer className="py-10 text-center space-y-2">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
          Designed for Champions
        </p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-slate-800" />
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Home;
