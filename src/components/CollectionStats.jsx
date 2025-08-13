import { useMemo } from 'react';
import { Users, Star, TrendingUp, Clock } from 'lucide-react';

const CollectionStats = ({ collections, activeTab }) => {
  const stats = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    
    const activeCollections = collections.filter(col => {
      const phases = col.phases || {};
      return Object.values(phases).some(
        phase => Number(phase.start) <= now && now <= Number(phase.end)
      );
    });

    const upcomingCollections = collections.filter(col => {
      const phases = col.phases || {};
      return Object.values(phases).some(phase => Number(phase.start) > now);
    });

    const completedCollections = collections.filter(col => {
      const phases = col.phases || {};
      const allPhasesEnded = Object.values(phases).length > 0 && 
        Object.values(phases).every(phase => Number(phase.end) < now);
      return col.soldOut || allPhasesEnded;
    });

    const totalMinted = collections.reduce((sum, col) => sum + (col.minted || 0), 0);
    const totalSupply = collections.reduce((sum, col) => sum + (col.totalSupply || 0), 0);
    const mintProgress = totalSupply > 0 ? Math.round((totalMinted / totalSupply) * 100) : 0;

    return {
      total: collections.length,
      active: activeCollections.length,
      upcoming: upcomingCollections.length,
      completed: completedCollections.length,
      totalMinted,
      totalSupply,
      mintProgress
    };
  }, [collections]);

  const getTabStats = () => {
    switch (activeTab) {
      case 'active':
        return {
          count: stats.active,
          icon: TrendingUp,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30'
        };
      case 'upcoming':
        return {
          count: stats.upcoming,
          icon: Clock,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30'
        };
      case 'completed':
        return {
          count: stats.completed,
          icon: Star,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          borderColor: 'border-purple-500/30'
        };
      default:
        return {
          count: stats.total,
          icon: Users,
          color: 'text-zinc-400',
          bgColor: 'bg-zinc-500/20',
          borderColor: 'border-zinc-500/30'
        };
    }
  };

  const tabStats = getTabStats();

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-700/30 p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Текущий таб статистика */}
        <div className={`${tabStats.bgColor} ${tabStats.borderColor} border rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <div className={`${tabStats.color} p-2 rounded-lg bg-zinc-800/50`}>
              <tabStats.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm font-medium">
                {activeTab === 'active' ? 'Active' : 
                 activeTab === 'upcoming' ? 'Upcoming' : 
                 activeTab === 'completed' ? 'Completed' : 'Total'} Collections
              </p>
              <p className={`text-2xl font-bold ${tabStats.color}`}>
                {tabStats.count}
              </p>
            </div>
          </div>
        </div>

        {/* Общая статистика */}
        <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-zinc-400 p-2 rounded-lg bg-zinc-700/50">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm font-medium">Total Collections</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        {/* Прогресс минтинга */}
        <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-pink-400 p-2 rounded-lg bg-pink-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-zinc-400 text-sm font-medium">Mint Progress</p>
              <p className="text-2xl font-bold text-white">{stats.mintProgress}%</p>
              <div className="w-full bg-zinc-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-[#00A3FF] to-[#FF1CF7] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.mintProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Общее количество минтингов */}
        <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="text-blue-400 p-2 rounded-lg bg-blue-500/20">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-zinc-400 text-sm font-medium">Total Minted</p>
              <p className="text-2xl font-bold text-white">
                {stats.totalMinted.toLocaleString()}
              </p>
              <p className="text-zinc-500 text-xs">
                of {stats.totalSupply.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionStats; 