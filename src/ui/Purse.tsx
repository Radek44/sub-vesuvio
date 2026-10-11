/** The purse: bronze asses, counted the Roman way with the number beside it. */
import { toRoman } from '../lingua/roman';

export function Coin() {
  return (
    <svg className="coin" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="#b8763a" stroke="#6a3e18" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#8a5424" strokeWidth="1" />
      {/* the as was stamped with a ship's prow on one side */}
      <path d="M6.5 13.5 L16 13.5 L18 10.5 L15 11.5 L9 11.5 Z" fill="#7a4a20" />
    </svg>
  );
}

export function Purse({ coins, lang }: { coins: number; lang: 'en' | 'fr' }) {
  return (
    <span className="purse" data-ui="purse" title={lang === 'fr' ? `${coins} as` : `${coins} ${coins === 1 ? 'as' : 'asses'}`}>
      <Coin />
      <b lang="la">{coins > 0 ? toRoman(coins) : '—'}</b>
      <small>{coins}</small>
    </span>
  );
}
