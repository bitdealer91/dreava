// src/components/QuestImage.jsx
import { Link } from 'react-router-dom';
import questImage from '../assets/quest.png';

// Feature flag resolver: localStorage overrides env
const isQuestEnabled = () => {
  try {
    if (typeof window !== 'undefined') {
      const override = window.localStorage.getItem('dreava:enableQuest');
      if (override === 'true') return true;
      if (override === 'false') return false;
    }
  } catch {}
  // Default off in production
  const env = import.meta?.env?.VITE_ENABLE_QUEST;
  return env === 'true';
};

const QuestImage = ({ forceShow = false }) => {
  const show = forceShow || isQuestEnabled();
  if (!show) return null;
  return (
    <div className="fixed top-20 right-6 z-[9998] pointer-events-auto">
      <Link to="/somnia-quest">
        <img 
          src={questImage} 
          alt="Quest" 
          className="w-32 h-32 opacity-80 hover:opacity-100 hover:scale-110 transition-all duration-300 ease-in-out cursor-pointer"
        />
      </Link>
    </div>
  );
};

export default QuestImage; 