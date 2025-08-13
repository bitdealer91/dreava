export const getIpfsUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return url;
};

export const getIpfsUrls = (url) => {
  if (!url) return [];
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return [
      `https://gateway.lighthouse.storage/ipfs/${cid}`
    ];
  }
  return [url];
}; 

export const fetchWithFallback = async (url) => {
  const tryFetchJson = async (u) => {
    const resp = await fetch(u, { method: 'GET', mode: 'cors', headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  };

  if (typeof url === 'string') {
    try {
      return await tryFetchJson(url);
    } catch (error) {
      throw new Error('Failed to fetch from URL');
    }
  } else if (Array.isArray(url)) {
    // Пробуем по очереди, при JSON parse ошибке продолжаем к следующему шлюзу
    for (const singleUrl of url) {
      try {
        return await tryFetchJson(singleUrl);
      } catch (error) {
        continue;
      }
    }
    throw new Error('All URLs failed');
  }
  throw new Error('Invalid URL format');
}; 