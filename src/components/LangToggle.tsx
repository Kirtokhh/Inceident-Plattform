'use client';

import { useT } from '@/lib/i18n';

export default function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useT();
  const btn = (l: 'de' | 'en', label: string) => (
    <button
      key={l}
      type="button"
      onClick={() => setLang(l)}
      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
        lang === l ? 'bg-hanse-navy text-white' : 'text-gray-500 hover:text-hanse-navy'
      }`}
      aria-pressed={lang === l}
    >
      {label}
    </button>
  );
  return (
    <div className={`inline-flex items-center border border-gray-200 rounded-lg p-0.5 ${className}`}>
      {btn('de', 'DE')}
      {btn('en', 'EN')}
    </div>
  );
}
