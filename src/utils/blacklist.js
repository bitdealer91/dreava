export const fetchBlacklist = async () => {
  try {
    const res = await fetch('/api/blacklist', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data.addresses) ? data.addresses : [];
    return list.map(a => String(a).toLowerCase());
  } catch {
    return [];
  }
};

let cached = null;
export const getIsBlacklisted = async (address) => {
  if (!address) return false;
  if (!cached) cached = await fetchBlacklist();
  return cached.includes(String(address).toLowerCase());
};

export const filterOutBlacklisted = async (collections) => {
  if (!Array.isArray(collections)) return [];
  if (!cached) cached = await fetchBlacklist();
  return collections.filter(c => !cached.includes(String(c.address || '').toLowerCase()));
}; 