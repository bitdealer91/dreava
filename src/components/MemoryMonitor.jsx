import { useEffect, useState, useCallback } from 'react';
import { HardDrive, AlertTriangle, Trash2, Activity } from 'lucide-react';

const MemoryMonitor = ({ 
  enabled = true, 
  criticalThreshold = 80, // Критический порог в %
  warningThreshold = 60,  // Предупреждение в %
  onCritical = null 
}) => {
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [isCritical, setIsCritical] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  // Получаем информацию о памяти
  const getMemoryInfo = useCallback(() => {
    if (!window.performance?.memory) return null;

    const memory = window.performance.memory;
    const usedPercent = Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
    
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usedPercent,
      available: memory.totalJSHeapSize - memory.usedJSHeapSize,
    };
  }, []);

  // Форматируем байты в читаемый вид
  const formatBytes = useCallback((bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Очищаем память
  const clearMemory = useCallback(() => {
    // Принудительный сбор мусора (если доступен)
    if (window.gc) {
      window.gc();
    }
    
    // Очищаем кэш изображений
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Очищаем localStorage если память критична
    if (isCritical) {
      const keysToKeep = ['user_preferences', 'theme', 'language'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Перезагружаем информацию о памяти
    setTimeout(() => {
      setMemoryInfo(getMemoryInfo());
    }, 100);
  }, [isCritical, getMemoryInfo]);

  // Мониторим память
  useEffect(() => {
    if (!enabled) return;

    const updateMemoryInfo = () => {
      const info = getMemoryInfo();
      if (!info) return;

      setMemoryInfo(info);
      
      // Проверяем критические значения
      if (info.usedPercent >= criticalThreshold) {
        setIsCritical(true);
        setIsWarning(false);
        if (onCritical) onCritical(info);
        console.warn('🚨 CRITICAL MEMORY USAGE:', info.usedPercent + '%');
      } else if (info.usedPercent >= warningThreshold) {
        setIsWarning(true);
        setIsCritical(false);
        console.warn('⚠️ HIGH MEMORY USAGE:', info.usedPercent + '%');
      } else {
        setIsWarning(false);
        setIsCritical(false);
      }
    };

    // Обновляем каждые 5 секунд
    const interval = setInterval(updateMemoryInfo, 5000);
    updateMemoryInfo(); // Первое обновление

    return () => clearInterval(interval);
  }, [enabled, criticalThreshold, warningThreshold, onCritical, getMemoryInfo]);

  // Автоматическая очистка при критической памяти
  useEffect(() => {
    if (isCritical && memoryInfo?.usedPercent >= 95) {
      console.warn('🚨 AUTO-MEMORY CLEANUP TRIGGERED');
      clearMemory();
    }
  }, [isCritical, memoryInfo, clearMemory]);

  if (!enabled || !memoryInfo) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 p-3 rounded-lg border transition-all duration-300 ${
      isCritical 
        ? 'bg-red-900/90 border-red-500 text-red-100' 
        : isWarning 
        ? 'bg-yellow-900/90 border-yellow-500 text-yellow-100'
        : 'bg-zinc-900/90 border-zinc-700 text-zinc-100'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className={`w-4 h-4 ${
          isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-zinc-400'
        }`} />
        <span className="text-sm font-medium">Memory Monitor</span>
        {isCritical && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
      </div>
      
      <div className="text-xs space-y-1 mb-2">
        <div>Used: <span className="font-medium">{formatBytes(memoryInfo.used)}</span></div>
        <div>Total: <span className="font-medium">{formatBytes(memoryInfo.total)}</span></div>
        <div>Usage: <span className={`font-bold ${
          isCritical ? 'text-red-300' : isWarning ? 'text-yellow-300' : 'text-zinc-300'
        }`}>{memoryInfo.usedPercent}%</span></div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-zinc-700 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${memoryInfo.usedPercent}%` }}
        />
      </div>
      
      {/* Action Button */}
      <button
        onClick={clearMemory}
        className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
          isCritical 
            ? 'bg-red-700 hover:bg-red-600 text-white' 
            : isWarning 
            ? 'bg-yellow-700 hover:bg-yellow-600 text-white'
            : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
        }`}
        title="Clear memory and caches"
      >
        <div className="flex items-center justify-center gap-1">
          <Trash2 className="w-3 h-3" />
          Clear Memory
        </div>
      </button>
    </div>
  );
};

export default MemoryMonitor; 