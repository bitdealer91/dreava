import { useEffect, useState, useRef } from 'react';

const PerformanceMonitor = ({ 
  enabled = true, 
  onMetrics = null,
  showUI = false 
}) => {
  const [metrics, setMetrics] = useState({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const observerRef = useRef(null);
  const navigationEntryRef = useRef(null);

  // Получаем метрики производительности
  const getPerformanceMetrics = () => {
    if (!window.performance) return {};

    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    if (navigation) {
      navigationEntryRef.current = navigation;
    }

    const metrics = {
      // Navigation Timing API
      dns: navigation?.domainLookupEnd - navigation?.domainLookupStart || 0,
      tcp: navigation?.connectEnd - navigation?.connectStart || 0,
      ttfb: navigation?.responseStart - navigation?.requestStart || 0,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
      totalTime: navigation?.loadEventEnd - navigation?.navigationStart || 0,
      
      // Paint Timing API
      firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      
      // Memory API (если доступен)
      memory: window.performance.memory ? {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
        memoryUsagePercent: Math.round((window.performance.memory.usedJSHeapSize / window.performance.memory.totalJSHeapSize) * 100),
      } : null,
      
      // User Timing API
      userTiming: performance.getEntriesByType('measure').reduce((acc, measure) => {
        acc[measure.name] = measure.duration;
        return acc;
      }, {}),
      
      // Дополнительные метрики для мониторинга нагрузки
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
      } : null,
      
      // Метрики ресурсов
      resources: performance.getEntriesByType('resource').length,
      resourceTypes: performance.getEntriesByType('resource').reduce((acc, resource) => {
        const type = resource.initiatorType || 'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      
      // Метрики ошибок
      errors: window.errorCount || 0,
      warnings: window.warningCount || 0,
    };

    return metrics;
  };

  // Отслеживаем ошибки и предупреждения
  const observeErrors = () => {
    // Счетчики ошибок
    window.errorCount = 0;
    window.warningCount = 0;
    
    // Перехватываем ошибки
    window.addEventListener('error', (event) => {
      window.errorCount++;
      console.error('🚨 Performance Monitor - Error:', event.error);
    });
    
    // Перехватываем предупреждения
    window.addEventListener('unhandledrejection', (event) => {
      window.warningCount++;
      console.warn('⚠️ Performance Monitor - Unhandled Promise Rejection:', event.reason);
    });
  };

  // Отслеживаем Core Web Vitals
  const observeCoreWebVitals = () => {
    if (!window.PerformanceObserver) return;

    try {
      // LCP (Largest Contentful Paint)
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        setMetrics(prev => ({
          ...prev,
          lcp: lastEntry.startTime,
          lcpElement: lastEntry.element?.tagName || 'unknown',
        }));
      });
      
      observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] });

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          setMetrics(prev => ({
            ...prev,
            fid: entry.processingStart - entry.startTime,
            fidElement: entry.name || 'unknown',
          }));
        });
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });

      // CLS (Cumulative Layout Shift)
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        setMetrics(prev => ({
          ...prev,
          cls: clsValue,
        }));
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // TTFB (Time to First Byte)
      const ttfbObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'navigation') {
            setMetrics(prev => ({
              ...prev,
              ttfb: entry.responseStart - entry.requestStart,
            }));
          }
        });
      });
      
      ttfbObserver.observe({ entryTypes: ['navigation'] });

    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  };

  // Анализируем производительность
  const analyzePerformance = () => {
    const currentMetrics = getPerformanceMetrics();
    const allMetrics = { ...metrics, ...currentMetrics };
    
    // Оценка производительности
    const scores = {
      lcp: allMetrics.lcp < 2500 ? 'good' : allMetrics.lcp < 4000 ? 'needs-improvement' : 'poor',
      fid: allMetrics.fid < 100 ? 'good' : allMetrics.fid < 300 ? 'needs-improvement' : 'poor',
      cls: allMetrics.cls < 0.1 ? 'good' : allMetrics.cls < 0.25 ? 'needs-improvement' : 'poor',
      ttfb: allMetrics.ttfb < 800 ? 'good' : allMetrics.ttfb < 1800 ? 'needs-improvement' : 'poor',
    };

    const overallScore = Object.values(scores).reduce((acc, score) => {
      if (score === 'good') acc += 1;
      else if (score === 'needs-improvement') acc += 0.5;
      return acc;
    }, 0) / Object.keys(scores).length;

    const analysis = {
      ...allMetrics,
      scores,
      overallScore: Math.round(overallScore * 100),
      timestamp: Date.now(),
    };

    setMetrics(analysis);
    
    if (onMetrics) {
      onMetrics(analysis);
    }

    return analysis;
  };

  useEffect(() => {
    if (!enabled) return;

    setIsMonitoring(true);
    
    // Начинаем мониторинг после загрузки страницы
    const startMonitoring = () => {
      observeErrors(); // Отслеживаем ошибки
      observeCoreWebVitals();
      
      // Анализируем производительность через 1 секунду после загрузки
      setTimeout(() => {
        analyzePerformance();
      }, 1000);
      
      // Периодический анализ каждые 30 секунд
      const interval = setInterval(analyzePerformance, 30000);
      
      return () => clearInterval(interval);
    };

    if (document.readyState === 'complete') {
      startMonitoring();
    } else {
      window.addEventListener('load', startMonitoring);
      return () => window.removeEventListener('load', startMonitoring);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, onMetrics]);

  // Отправляем метрики в аналитику
  useEffect(() => {
    if (metrics.overallScore && window.gtag) {
      window.gtag('event', 'performance_metrics', {
        event_category: 'performance',
        value: metrics.overallScore,
        custom_parameters: {
          lcp: metrics.lcp,
          fid: metrics.fid,
          cls: metrics.cls,
          ttfb: metrics.ttfb,
        }
      });
    }
  }, [metrics.overallScore]);

  if (!showUI || !isMonitoring) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg p-4 text-white text-sm z-50">
      <div className="font-semibold mb-2">Performance Monitor</div>
      
      {metrics.overallScore && (
        <div className="mb-2">
          <span className="text-zinc-400">Overall Score:</span>
          <span className={`ml-2 font-bold ${
            metrics.overallScore >= 80 ? 'text-green-400' : 
            metrics.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {metrics.overallScore}/100
          </span>
        </div>
      )}
      
      <div className="space-y-1 text-xs">
        {metrics.lcp && (
          <div className="flex justify-between">
            <span>LCP:</span>
            <span className={metrics.scores?.lcp === 'good' ? 'text-green-400' : 'text-red-400'}>
              {Math.round(metrics.lcp)}ms
            </span>
          </div>
        )}
        
        {metrics.fid && (
          <div className="flex justify-between">
            <span>FID:</span>
            <span className={metrics.scores?.fid === 'good' ? 'text-green-400' : 'text-red-400'}>
              {Math.round(metrics.fid)}ms
            </span>
          </div>
        )}
        
        {metrics.cls && (
          <div className="flex justify-between">
            <span>CLS:</span>
            <span className={metrics.scores?.cls === 'good' ? 'text-green-400' : 'text-red-400'}>
              {metrics.cls.toFixed(3)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitor; 