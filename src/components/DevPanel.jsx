import { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Bug, BarChart3, Database, Zap, HardDrive } from 'lucide-react';

const DevPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showCacheInfo, setShowCacheInfo] = useState(false);

  // Проверяем что мы в development режиме или есть специальный ключ
  const isDevMode = import.meta.env.DEV || localStorage.getItem('devMode') === 'true';
  
  // Скрываем панель если не dev режим
  if (!isDevMode) {
    return null;
  }

  // Обработчики для toggle функций
  const togglePerformanceStats = () => {
    const newValue = !showPerformanceStats;
    setShowPerformanceStats(newValue);
    localStorage.setItem('showPerformanceStats', newValue.toString());
    // Перезагружаем страницу чтобы применить изменения
    window.location.reload();
  };

  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
    localStorage.setItem('showDebugInfo', (!showDebugInfo).toString());
  };

  const toggleCacheInfo = () => {
    setShowCacheInfo(!showCacheInfo);
    localStorage.setItem('showCacheInfo', (!showCacheInfo).toString());
  };

  // Загружаем сохраненные настройки
  useEffect(() => {
    setShowPerformanceStats(localStorage.getItem('showPerformanceStats') === 'true');
    setShowDebugInfo(localStorage.getItem('showDebugInfo') === 'true');
    setShowCacheInfo(localStorage.getItem('showCacheInfo') === 'true');
  }, []);

  return (
    <>
      {/* Кнопка для показа панели */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-4 right-4 z-50 p-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-all duration-200"
        title="Developer Panel"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Панель разработчика */}
      {isVisible && (
        <div className="fixed top-16 right-4 z-50 w-80 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg p-4 text-white text-sm shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Developer Panel</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {/* Performance Stats Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span>Performance Stats</span>
              </div>
              <button
                onClick={togglePerformanceStats}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  showPerformanceStats 
                    ? 'bg-green-600 text-white' 
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {showPerformanceStats ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Debug Info Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-yellow-400" />
                <span>Debug Info</span>
              </div>
              <button
                onClick={toggleDebugInfo}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  showDebugInfo 
                    ? 'bg-green-600 text-white' 
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {showDebugInfo ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Cache Info Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Cache Info</span>
              </div>
              <button
                onClick={toggleCacheInfo}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  showCacheInfo 
                    ? 'bg-green-600 text-white' 
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {showCacheInfo ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Memory Monitor Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-orange-400" />
                <span>Memory Monitor</span>
              </div>
              <button
                onClick={() => {
                  const newValue = !localStorage.getItem('showMemoryMonitor');
                  localStorage.setItem('showMemoryMonitor', newValue.toString());
                  window.location.reload();
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  localStorage.getItem('showMemoryMonitor') === 'true'
                    ? 'bg-green-600 text-white' 
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {localStorage.getItem('showMemoryMonitor') === 'true' ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Environment Info */}
            <div className="p-3 bg-zinc-800/30 rounded-lg">
              <div className="text-xs text-zinc-400 mb-2">Environment</div>
              <div className="text-xs space-y-1">
                <div>Mode: <span className="text-green-400">{import.meta.env.MODE}</span></div>
                <div>Node: <span className="text-blue-400">{import.meta.env.NODE_ENV}</span></div>
                <div>Version: <span className="text-purple-400">{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 bg-zinc-800/30 rounded-lg">
              <div className="text-xs text-zinc-400 mb-2">Quick Actions</div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  Reload
                </button>
                <button
                  onClick={() => localStorage.clear()}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  Clear Storage
                </button>
                <button
                  onClick={() => console.clear()}
                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                >
                  Clear Console
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <div className="text-xs text-blue-300">
                <strong>Tip:</strong> Use <code className="bg-blue-800 px-1 rounded">localStorage.setItem('devMode', 'true')</code> in console to enable dev panel in production
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevPanel; 