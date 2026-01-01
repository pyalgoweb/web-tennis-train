import React, { useState } from 'react';
import Home from './components/layout/Home';
import RhythmGame from './games/RhythmGame/RhythmGame';
import TrajectoryGame from './games/TrajectoryGame/TrajectoryGame';
import ReactionSpeed from './games/ReactionSpeed/ReactionSpeed';

function App() {
  const [activeGame, setActiveGame] = useState(null);

  const renderContent = () => {
    switch (activeGame) {
      case 'rhythm':
        return <RhythmGame onBack={() => setActiveGame(null)} />;
      case 'trajectory':
        return <TrajectoryGame onBack={() => setActiveGame(null)} />;
      case 'reaction':
        return <ReactionSpeed onBack={() => setActiveGame(null)} />;
      default:
        return <Home onSelectGame={setActiveGame} />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-white">
      {renderContent()}
      </div>
  );
}

export default App;
