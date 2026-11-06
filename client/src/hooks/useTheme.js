import { useEffect, useState } from 'react';

const read = () => { try { return localStorage.getItem('theme'); } catch { return null; } };

export function useTheme() {
  const [dark, setDark] = useState(() => (read() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* storage blocked: theme just won't persist */ }
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}
