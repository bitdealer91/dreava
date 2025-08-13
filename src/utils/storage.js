const getApiBase = () => {
  // In dev (Vite on 5173), use relative URLs so dev proxy handles requests
  try {
    const isBrowser = typeof window !== 'undefined';
    const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isVite = isBrowser && String(window.location.port) === '5173';
    if (isLocal && isVite) return '';
    const envBase = import.meta?.env?.VITE_API_BASE;
    if (envBase && typeof envBase === 'string' && envBase.trim()) {
      const v = envBase.trim().replace(/\/$/, '');
      if (/^https?:\/\//i.test(v)) return v;
    }
  } catch {}
  return '';
};

const buildApiUrl = (path) => {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
};

export const uploadFile = async (file) => {
  console.log('📤 uploadFile called with:', file);

  const endpoints = [
    buildApiUrl('/api/upload-file'),
    '/api/upload-file',
    buildApiUrl('/upload-file'),
    '/upload-file',
    buildApiUrl('/api/pin-file'),
    '/api/pin-file',
    buildApiUrl('/pin-file'),
    '/pin-file',
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      // Rebuild FormData for each attempt to avoid detached/consumed body errors
      const formData = new FormData();
      formData.append('file', file);

      console.log(`📤 Sending request to ${endpoint}`);
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      console.log('📤 Response status:', res.status, 'for', endpoint);

      if (!res.ok) {
        let errorData = {};
        try {
          errorData = await res.json();
        } catch {}
        console.error(`❌ Upload failed on ${endpoint}:`, errorData);
        lastError = new Error(errorData.error || `Upload failed (${res.status}) at ${endpoint}`);
        continue;
      }

      const data = await res.json();
      console.log('📤 Upload response:', data);
      const result = data.gatewayUrl || data.url || data.cid;
      console.log('📤 Final result URL:', result);
      return data;
    } catch (e) {
      console.error(`❌ Request error on ${endpoint}:`, e);
      lastError = e;
      continue;
    }
  }

  throw lastError || new Error('File upload failed');
};

export const uploadMetadata = async (metadata) => {
  console.log('📋 uploadMetadata called with:', metadata);
  const endpoints = [
    { url: buildApiUrl('/api/upload-metadata'), method: 'POST', body: JSON.stringify({ metadata }), headers: { 'Content-Type': 'application/json' } },
    { url: '/api/upload-metadata', method: 'POST', body: JSON.stringify({ metadata }), headers: { 'Content-Type': 'application/json' } },
    { url: buildApiUrl('/pin-json'), method: 'POST', body: JSON.stringify({ metadata }), headers: { 'Content-Type': 'application/json' } },
    { url: '/pin-json', method: 'POST', body: JSON.stringify({ metadata }), headers: { 'Content-Type': 'application/json' } },
  ];

  let lastError = null;
  for (const ep of endpoints) {
    try {
      console.log('📋 Trying metadata endpoint:', ep.url);
      const res = await fetch(ep.url, { method: ep.method, headers: ep.headers, body: ep.body });
      console.log('📋 Metadata upload response status:', res.status, 'for', ep.url);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ Metadata upload failed:', errorData);
        lastError = new Error(errorData.error || `Metadata upload failed (${res.status}) at ${ep.url}`);
        continue;
      }

      const data = await res.json();
      console.log('📋 Metadata upload response data:', data);

      return { url: data.url || data.ipfsUri, ...data };
    } catch (e) {
      console.error(`❌ Metadata request error on ${ep.url}:`, e);
      lastError = e;
      continue;
    }
  }

  throw lastError || new Error('Metadata upload failed');
}; 