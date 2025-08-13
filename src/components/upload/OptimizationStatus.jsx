// OptimizationStatus.jsx - Компонент статуса оптимизаций
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Zap, Cpu, HardDrive, Wifi } from 'lucide-react';
import { features, featureFlags } from '../../utils/featureDetection.js';

const OptimizationStatus = ({ isVisible = false, onClose }) => {
  const [optimizationStats, setOptimizationStats] = useState(null);

  useEffect(() => {
    if (isVisible) {
      // Получаем статистику оптимизаций
      const stats = {
        features,
        flags: featureFlags,
        supported: Object.keys(features).filter(key => features[key]),
        enabled: Object.keys(featureFlags).filter(key => featureFlags[key])
      };
      setOptimizationStats(stats);
    }
  }, [isVisible]);

  if (!isVisible || !optimizationStats) return null;

  const getStatusIcon = (supported, enabled) => {
    if (supported && enabled) return <CheckCircle size={16} className="text-green-400" />;
    if (supported && !enabled) return <AlertTriangle size={16} className="text-yellow-400" />;
    return <XCircle size={16} className="text-red-400" />;
  };

  const getStatusText = (supported, enabled) => {
    if (supported && enabled) return 'Active';
    if (supported && !enabled) return 'Available';
    return 'Not Supported';
  };

  const getStatusColor = (supported, enabled) => {
    if (supported && enabled) return 'text-green-400';
    if (supported && !enabled) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/30 rounded-2xl p-4 shadow-2xl w-80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-blue-400" />
            <span className="text-sm text-white font-semibold">Optimization Status</span>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              ×
            </button>
          )}
        </div>

        <div className="space-y-3">
          {/* WebAssembly */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-purple-400" />
              <span className="text-xs text-white">WebAssembly</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(features.webAssembly, featureFlags.enableWasm)}
              <span className={`text-xs ${getStatusColor(features.webAssembly, featureFlags.enableWasm)}`}>
                {getStatusText(features.webAssembly, featureFlags.enableWasm)}
              </span>
            </div>
          </div>

          {/* Service Worker */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-blue-400" />
              <span className="text-xs text-white">Service Worker</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(features.serviceWorker, featureFlags.enableServiceWorker)}
              <span className={`text-xs ${getStatusColor(features.serviceWorker, featureFlags.enableServiceWorker)}`}>
                {getStatusText(features.serviceWorker, featureFlags.enableServiceWorker)}
              </span>
            </div>
          </div>

          {/* SharedArrayBuffer */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-green-400" />
              <span className="text-xs text-white">SharedArrayBuffer</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(features.sharedArrayBuffer, featureFlags.enableSharedArrayBuffer)}
              <span className={`text-xs ${getStatusColor(features.sharedArrayBuffer, featureFlags.enableSharedArrayBuffer)}`}>
                {getStatusText(features.sharedArrayBuffer, featureFlags.enableSharedArrayBuffer)}
              </span>
            </div>
          </div>

          {/* WebTransport */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <Wifi size={14} className="text-orange-400" />
              <span className="text-xs text-white">WebTransport</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(features.webTransport, featureFlags.enableWebTransport)}
              <span className={`text-xs ${getStatusColor(features.webTransport, featureFlags.enableWebTransport)}`}>
                {getStatusText(features.webTransport, featureFlags.enableWebTransport)}
              </span>
            </div>
          </div>

          {/* Compression */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-cyan-400" />
              <span className="text-xs text-white">Compression</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(features.compressionStreams, featureFlags.enableCompression)}
              <span className={`text-xs ${getStatusColor(features.compressionStreams, featureFlags.enableCompression)}`}>
                {getStatusText(features.compressionStreams, featureFlags.enableCompression)}
              </span>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="mt-4 pt-3 border-t border-zinc-700">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-zinc-400">Supported</div>
              <div className="text-white font-medium">{optimizationStats.supported.length}</div>
            </div>
            <div className="text-center">
              <div className="text-zinc-400">Enabled</div>
              <div className="text-white font-medium">{optimizationStats.enabled.length}</div>
            </div>
          </div>
        </div>

        {/* Рекомендации */}
        <div className="mt-3 text-xs text-zinc-400">
          {optimizationStats.supported.length < 3 && (
            <div className="text-yellow-400 mb-1">
              ⚠️ Consider updating your browser for better performance
            </div>
          )}
          {optimizationStats.enabled.length > 0 && (
            <div className="text-green-400">
              ✅ {optimizationStats.enabled.length} optimizations active
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizationStatus; 