// featureDetection.js - Система определения возможностей браузера
export const features = {
  // WebAssembly поддержка
  webAssembly: typeof WebAssembly !== 'undefined',
  
  // SharedArrayBuffer поддержка
  sharedArrayBuffer: typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated && 'SharedArrayBuffer' in globalThis,
  
  // WebTransport поддержка
  webTransport: 'WebTransport' in window,
  
  // Service Worker поддержка
  serviceWorker: 'serviceWorker' in navigator,
  
  // File System Access API
  fileSystemAccess: 'showOpenFilePicker' in window,
  
  // WebGPU поддержка
  webGPU: 'gpu' in navigator,
  
  // Compression Streams API
  compressionStreams: 'CompressionStream' in window,
  
  // WebCodecs поддержка
  webCodecs: 'VideoEncoder' in window,
  
  // Background Sync API
  backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration?.prototype,
  
  // WebAssembly SIMD
  webAssemblySimd: typeof WebAssembly !== 'undefined' && WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,9,1,7,0,65,0,253,15,26,0,11]))
};

// Feature flags для контроля функций
export const featureFlags = {
  enableWasm: true,
  // Temporarily disable SW in dev to avoid conflicts; prod only
  enableServiceWorker: typeof window !== 'undefined' && !location.port,
  enableSharedArrayBuffer: true,
  enableWebTransport: true,
  enableWebGPU: false, // Отключено по умолчанию
  enableFileSystemAccess: false, // Отключено по умолчанию
  enableCompression: true,
  enableBackgroundSync: false // Отключено по умолчанию
};

// Проверка поддержки конкретных функций
export const checkFeatureSupport = (featureName) => {
  const featureMap = {
    'wasm': features.webAssembly && featureFlags.enableWasm,
    'sharedArrayBuffer': features.sharedArrayBuffer && featureFlags.enableSharedArrayBuffer,
    'webTransport': features.webTransport && featureFlags.enableWebTransport,
    'serviceWorker': features.serviceWorker && featureFlags.enableServiceWorker,
    'fileSystemAccess': features.fileSystemAccess && featureFlags.enableFileSystemAccess,
    'webGPU': features.webGPU && featureFlags.enableWebGPU,
    'compression': features.compressionStreams && featureFlags.enableCompression,
    'backgroundSync': features.backgroundSync && featureFlags.enableBackgroundSync
  };
  
  return featureMap[featureName] || false;
};

// Логирование возможностей браузера
export const logBrowserCapabilities = () => {
  console.log('🔍 Browser Capabilities:', {
    ...features,
    flags: featureFlags,
    supported: Object.keys(features).filter(key => features[key])
  });
  
  // Логируем в продакшене для мониторинга
  if (process.env.NODE_ENV === 'production') {
    console.log('📊 Production Feature Stats:', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      features: features,
      flags: featureFlags
    });
  }
};

// Инициализация при загрузке
logBrowserCapabilities(); 