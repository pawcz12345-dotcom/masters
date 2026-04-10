'use client';

import { useEffect, useState } from 'react';

// Stamps the page-load time on the client so the server render stays
// deterministic — prevents unnecessary Vercel ISR writes every revalidation.
export default function LastUpdated() {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const loadedAt = Date.now();
    function update() {
      const diff = Math.floor((Date.now() - loadedAt) / 1000);
      if (diff < 60) setLabel(`Updated ${diff}s ago`);
      else if (diff < 3600) setLabel(`Updated ${Math.floor(diff / 60)}m ago`);
      else setLabel(`Updated ${Math.floor(diff / 3600)}h ago`);
    }
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  if (!label) return null;

  return <span className="text-xs text-masters-ink-3 dark:text-masters-d-ink-3">{label}</span>;
}
