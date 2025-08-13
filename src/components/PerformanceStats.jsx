import { useState, useEffect } from 'react';
import { BarChart3, Activity, AlertTriangle, CheckCircle, Clock, HardDrive, Wifi, Zap } from 'lucide-react';

const PerformanceStats = ({ metrics, showDetails = false, isVisible = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Скрываем статистику если не включена видимость
  if (!isVisible || !metrics || Object.keys(metrics).length === 0) {
    return null;
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms) => {
    if (!ms) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg p-4 text-white text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">Performance Stats</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Overall Score */}
      {metrics.overallScore && (
        <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400">Overall Score</span>
            <div className={`flex items-center gap-2 ${getScoreColor(metrics.overallScore)}`}>
              {getScoreIcon(metrics.overallScore)}
              <span className="font-bold text-lg">{metrics.overallScore}/100</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                metrics.overallScore >= 80 ? 'bg-green-500' : 
                metrics.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${metrics.overallScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Core Web Vitals */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {metrics.lcp && (
          <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded">
            <Zap className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-xs text-zinc-400">LCP</div>
              <div className="font-medium">{formatTime(metrics.lcp)}</div>
            </div>
          </div>
        )}
        
        {metrics.fid && (
          <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded">
            <Activity className="w-4 h-4 text-green-400" />
            <div>
              <div className="text-xs text-zinc-400">FID</div>
              <div className="font-medium">{formatTime(metrics.fid)}</div>
            </div>
          </div>
        )}
        
        {metrics.cls && (
          <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <div>
              <div className="text-xs text-zinc-400">CLS</div>
              <div className="font-medium">{metrics.cls.toFixed(3)}</div>
            </div>
          </div>
        )}
        
        {metrics.ttfb && (
          <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded">
            <Clock className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-xs text-zinc-400">TTFB</div>
              <div className="font-medium">{formatTime(metrics.ttfb)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-3 border-t border-zinc-700 pt-3">
          {/* Memory Usage */}
          {metrics.memory && (
            <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <div className="flex-1">
                <div className="text-xs text-zinc-400">Memory Usage</div>
                <div className="font-medium">{formatBytes(metrics.memory.usedJSHeapSize)} / {formatBytes(metrics.memory.totalJSHeapSize)}</div>
                <div className="text-xs text-zinc-500">{metrics.memory.memoryUsagePercent}% used</div>
              </div>
            </div>
          )}

          {/* Network Info */}
          {metrics.connection && (
            <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded">
              <Wifi className="w-4 h-4 text-green-400" />
              <div className="flex-1">
                <div className="text-xs text-zinc-400">Network</div>
                <div className="font-medium">{metrics.connection.effectiveType} • {metrics.connection.downlink}Mbps</div>
                <div className="text-xs text-zinc-500">RTT: {metrics.connection.rtt}ms</div>
              </div>
            </div>
          )}

          {/* Resources */}
          <div className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded">
            <BarChart3 className="w-4 h-4 text-orange-400" />
            <div className="flex-1">
              <div className="text-xs text-zinc-400">Resources Loaded</div>
              <div className="font-medium">{metrics.resources} total</div>
              {metrics.resourceTypes && (
                <div className="text-xs text-zinc-500">
                  {Object.entries(metrics.resourceTypes).slice(0, 3).map(([type, count]) => (
                    <span key={type} className="mr-2">{type}: {count}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Errors & Warnings */}
          {(metrics.errors > 0 || metrics.warnings > 0) && (
            <div className="flex items-center gap-2 p-2 bg-red-900/30 rounded border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <div className="flex-1">
                <div className="text-xs text-red-400">Issues Detected</div>
                <div className="font-medium text-red-300">
                  {metrics.errors} errors • {metrics.warnings} warnings
                </div>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-zinc-500 text-center">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceStats; 