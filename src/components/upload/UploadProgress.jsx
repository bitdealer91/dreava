// UploadProgress.jsx - Улучшенный компонент прогресса загрузки
import { useState, useEffect } from 'react';
import { X, Pause, Play, RotateCcw, CheckCircle, AlertCircle, Clock, HardDrive, Wifi } from 'lucide-react';

const UploadProgress = ({ 
  isVisible = false, 
  onClose, 
  progress = 0, 
  progressText = '', 
  batchProgress = null,
  results = [], 
  failed = [], 
  onRetry,
  onPause,
  onResume,
  isPaused = false,
  estimatedTime = null,
  uploadSpeed = null
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Автоскролл к новым результатам
  useEffect(() => {
    if (autoScroll && results.length > 0) {
      const resultsContainer = document.getElementById('upload-results');
      if (resultsContainer) {
        resultsContainer.scrollTop = resultsContainer.scrollHeight;
      }
    }
  }, [results, autoScroll]);

  if (!isVisible) return null;

  const totalItems = results.length + failed.length;
  const successRate = totalItems > 0 ? (results.length / totalItems * 100).toFixed(1) : 0;
  const isComplete = progress === 100;

  // Определяем цвет прогресса
  const getProgressColor = () => {
    if (failed.length > 0 && results.length === 0) return 'bg-red-500';
    if (failed.length > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Форматирование времени
  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Форматирование скорости
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return 'N/A';
    const mbps = bytesPerSecond / (1024 * 1024);
    return `${mbps.toFixed(2)} MB/s`;
  };

  return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[9996] p-4">
              <div className="bg-zinc-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" tabIndex={-1} autoFocus>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              {isComplete ? (
                <CheckCircle size={20} className="text-white" />
              ) : (
                <Clock size={20} className="text-white" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {isComplete ? 'Upload Complete' : 'Upload Progress'}
              </h3>
              <p className="text-sm text-zinc-400">
                {totalItems} items • {successRate}% success rate
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isComplete && (
              <>
                {isPaused ? (
                  <button
                    onClick={onResume}
                    className="p-2 text-green-400 hover:text-green-300 transition-colors"
                    title="Resume upload"
                  >
                    <Play size={16} />
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                    title="Pause upload"
                  >
                    <Pause size={16} />
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-zinc-400 mb-2">
              <span>Overall Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-3 relative overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Progress Text */}
          <p className="text-sm text-zinc-300 mb-4">{progressText}</p>

          {/* Batch Progress */}
          {batchProgress && (
            <div className="mb-4 p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={14} className="text-blue-400" />
                <span className="text-sm text-white font-medium">Batch Progress</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400">Batch:</span>
                  <span className="text-white ml-1">{batchProgress.current}/{batchProgress.total}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Success:</span>
                  <span className="text-green-400 ml-1">{batchProgress.success}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Failed:</span>
                  <span className="text-red-400 ml-1">{batchProgress.failed}</span>
                </div>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">{results.length}</div>
              <div className="text-xs text-zinc-400">Successful</div>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-400">{failed.length}</div>
              <div className="text-xs text-zinc-400">Failed</div>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{successRate}%</div>
              <div className="text-xs text-zinc-400">Success Rate</div>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {uploadSpeed ? formatSpeed(uploadSpeed) : 'N/A'}
              </div>
              <div className="text-xs text-zinc-400">Speed</div>
            </div>
          </div>

          {/* Estimated Time */}
          {estimatedTime && !isComplete && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
              <Clock size={14} />
              <span>Estimated time remaining: {formatTime(estimatedTime)}</span>
            </div>
          )}

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Details Section */}
        {showDetails && (
          <div className="border-t border-zinc-700">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-white">Upload Details</span>
                <label className="flex items-center gap-1 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3 h-3"
                  />
                  Auto-scroll
                </label>
              </div>
              
              <div 
                id="upload-results"
                className="max-h-64 overflow-y-auto space-y-1 text-sm"
              >
                {results.map((result, index) => (
                  <div key={`success-${index}`} className="flex items-center gap-2 text-green-400">
                    <CheckCircle size={12} />
                    <span>✅ {result.name || `Item ${index + 1}`}</span>
                  </div>
                ))}
                
                {failed.map((fail, index) => (
                  <div key={`failed-${index}`} className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={12} />
                    <span>❌ {fail.name || `Item ${index + 1}`} - {fail.reason || 'Failed'}</span>
                  </div>
                ))}
                
                {results.length === 0 && failed.length === 0 && (
                  <div className="text-zinc-500 text-center py-4">
                    No uploads yet...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-t border-zinc-700">
          <div className="flex gap-3">
            {failed.length > 0 && (
              <button
                onClick={onRetry}
                className="flex-1 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                Retry Failed ({failed.length})
              </button>
            )}
            
            {isComplete ? (
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadProgress; 