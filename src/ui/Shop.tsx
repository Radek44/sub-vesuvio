/**
 * A shop's counter: the painted sign, the keeper, and what they sell, each thing by its Latin name (its
 * meaning on tap) with its price in asses written the Roman way. Buying is one tap; what you can't
 * afford or can't carry says why instead of failing silently. The purse shows what's left.
 */
import { useEffect, useMemo } from 'react';
import { useStore } from 'ymir/ui';
import { queue, store } from '../game';
import { district } from '../level';
import { ITEMS, type ItemId } from '../content/items';
import { toRoman } from '../lingua/roman';
import { itemIcons, portraits } from './portraits';
import { nameOf } from './names';
import { Purse } from './Purse';

const UI = {
  en: { buy: 'Buy', poor: 'Not enough', full: 'Can’t carry more', have: 'You have', leave: 'Leave', price: (n: number) => `${n} ${n === 1 ? 'as' : 'asses'}` },
  fr: { buy: 'Acheter', poor: 'Pas assez', full: 'Plus de place', have: 'Tu as', leave: 'Partir', price: (n: number) => `${n} as` },
};

export function Shop() {
  const id = useStore(store, (v) => v.sim.shop);
  const at = useStore(store, (v) => v.sim.district);
  const coins = useStore(store, (v) => v.sim.coins);
  const items = useStore(store, (v) => v.sim.items);
  const lang = useStore(store, (v) => v.save.lang);
  const shop = id ? district(at).shops.find((s) => s.id === id) : undefined;
  const keeper = shop ? district(at).npcs.find((n) => n.id === shop.keeper) : undefined;
  const icons = useMemo(itemIcons, []);
  const face = keeper ? portraits([keeper.who])[keeper.who] : undefined;
  useEffect(() => {
    if (!shop) return;
    // number keys buy; the act key closes (the controller handles Escape)
    const onKey = (e: KeyboardEvent) => { const n = Number(e.key); const line = shop.stock[n - 1]; if (line) queue({ buy: line.item as ItemId }); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [shop]);
  if (!shop) return null;
  const t = UI[lang];
  const who = keeper ? nameOf(keeper.who, lang) : null;
  return (
    <div className="sheet shop" data-ui="shop" role="dialog" aria-label={shop.name[lang]}>
      <header className="shop-head">
        {face && <img className="face" src={face} alt="" />}
        <div>
          <div className="signboard" lang="la">{shop.sign}</div>
          <div className="shop-name">{shop.name[lang]}{who?.name && !shop.name[lang].includes(who.name) && <> · <span className={who.la ? 'la' : ''}>{who.name}</span></>}</div>
        </div>
      </header>
      <ul className="stock">
        {shop.stock.map((line, i) => {
          const item = ITEMS[line.item as ItemId];
          const have = items[line.item as ItemId] ?? 0;
          const full = have >= item.max, poor = coins < line.price;
          return (
            <li key={line.item}>
              <img className="icon" src={icons[line.item]} alt="" />
              <div className="what">
                <span className="la" lang="la">{item.la}</span>
                <span className="mean">{item[lang]}</span>
                {have > 0 && <span className="have">{t.have} {have}</span>}
              </div>
              <div className="price" title={t.price(line.price)}>
                <span className="roman" lang="la">{toRoman(line.price)}</span>
                <small>{t.price(line.price)}</small>
              </div>
              <button type="button" className="buy" data-ui={`buy-${line.item}`} disabled={full || poor} onClick={() => queue({ buy: line.item as ItemId })}>
                <span className="n">{i + 1}</span>{full ? t.full : poor ? t.poor : t.buy}
              </button>
            </li>
          );
        })}
      </ul>
      <footer>
        <Purse coins={coins} lang={lang} />
        <button type="button" className="cta small" data-ui="leave" onClick={() => queue({ close: true })}>{t.leave}</button>
      </footer>
    </div>
  );
}
