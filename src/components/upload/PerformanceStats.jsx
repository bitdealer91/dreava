// PerformanceStats.jsx - Компонент для отображения статистики производительности
import { useState, useEffect } from 'react';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { BarChart3, TrendingUp, Clock, HardDrive, Wifi, Cpu, Download, AlertTriangle } from 'lucide-react';

const PerformanceStats = ({ isVisible = false, onClose }) => {
  const [metrics, setMetrics] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const currentMetrics = performanceMonitor.getMetrics();
      const summary = performanceMonitor.getPerformanceSummary();
      setMetrics({ ...currentMetrics, summary });
    };

    updateMetrics();

    if (autoRefresh) {
      const interval = setInterval(updateMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible, autoRefresh]);

  if (!isVisible || !metrics) return null;

  const { summary } = metrics;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Компактный вид */}
      {!isExpanded && (
        <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/30 rounded-2xl p-3 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-400" />
              <span className="text-xs text-white font-medium">Performance</span>
            </div>
            
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Download size={12} className="text-green-400" />
                <span className="text-green-400">{summary.uploads.successRate}%</span>
              </div>
              
              <div className="flex items-center gap-1">
                <HardDrive size={12} className="text-purple-400" />
                <span className="text-purple-400">{summary.cache.hitRate}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Wifi size={12} className="text-blue-400" />
                <span className="text-blue-400">{summary.network.errorRate}%</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Expand
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Расширенный вид */}
      {isExpanded && (
        <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/30 rounded-2xl p-4 shadow-2xl w-80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400" />
              <span className="text-sm text-white font-semibold">Performance Monitor</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-xs px-2 py-1 rounded ${
                  autoRefresh 
                    ? 'bg-green-600 text-white' 
                    : 'bg-zinc-700 text-zinc-300'
                }`}
              >
                Auto
              </button>
              
              <button
                onClick={() => setIsExpanded(false)}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Collapse
              </button>
              
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Uploads Section */}
          <div className="space-y-3">
            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Download size={14} className="text-green-400" />
                <span className="text-xs text-white font-medium">Uploads</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-400">Total:</span>
                  <span className="text-white ml-1">{summary.uploads.total}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Success:</span>
                  <span className="text-green-400 ml-1">{summary.uploads.successRate}%</span>
                </div>
                <div>
                  <span className="text-zinc-400">Speed:</span>
                  <span className="text-blue-400 ml-1">{summary.uploads.averageSpeed}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Data:</span>
                  <span className="text-purple-400 ml-1">{summary.uploads.totalData}</span>
                </div>
              </div>
            </div>

            {/* Cache Section */}
            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={14} className="text-purple-400" />
                <span className="text-xs text-white font-medium">Cache</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-400">Hit Rate:</span>
                  <span className="text-purple-400 ml-1">{summary.cache.hitRate}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Items:</span>
                  <span className="text-white ml-1">{summary.cache.items}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-400">Memory:</span>
                  <span className="text-blue-400 ml-1">{summary.cache.memory}</span>
                </div>
              </div>
            </div>

            {/* Network Section */}
            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={14} className="text-blue-400" />
                <span className="text-xs text-white font-medium">Network</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-400">Requests:</span>
                  <span className="text-white ml-1">{summary.network.requests}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Errors:</span>
                  <span className="text-red-400 ml-1">{summary.network.errorRate}%</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-400">Avg Response:</span>
                  <span className="text-green-400 ml-1">{summary.network.averageResponseTime}</span>
                </div>
              </div>
            </div>

            {/* Memory Section */}
            <div className="bg-zinc-800/30 rounded-xl p-3 border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={14} className="text-orange-400" />
                <span className="text-xs text-white font-medium">Memory</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-400">Used:</span>
                  <span className="text-orange-400 ml-1">{summary.memory.used}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Peak:</span>
                  <span className="text-red-400 ml-1">{summary.memory.peak}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-400">Available:</span>
                  <span className="text-green-400 ml-1">{summary.memory.available}</span>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-yellow-400" />
                <span className="text-xs text-white font-medium">Duration</span>
              </div>
              
              <div className="text-xs">
                <span className="text-zinc-400">Total Time:</span>
                <span className="text-yellow-400 ml-1">{summary.duration}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const data = performanceMonitor.exportMetrics();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded transition-colors"
              >
                Export
              </button>
              
              <button
                onClick={() => {
                  performanceMonitor.reset();
                  setMetrics(null);
                }}
                className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceStats; 