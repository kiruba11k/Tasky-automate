import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Ellipsis, LogOut, Palette, Settings, X } from 'lucide-react';
import { cx } from '@/internal/ui/cx';

const PRIMARY = 4; // tabs in the bottom bar; everything else goes under "More"

/** Phone navigation: a bottom tab bar (the side rail is hidden below 768px) with a "More" sheet for the rest and the account actions. */
export function MobileNav({ items, onProject, projectLabel, onTheme, onLogout }) {
  const [more, setMore] = useState(false);
  const loc = useLocation();
  useEffect(() => { setMore(false); }, [loc.pathname]);
  const main = items.slice(0, PRIMARY);
  const rest = items.slice(PRIMARY);
  const restActive = rest.some((i) => i.to === loc.pathname);
  const tab = (item, extra = '') => ({ isActive }) => cx('m-tab', isActive && 'm-tab-on', extra);
  const badgeTotal = rest.reduce((n, i) => n + (i.badge || 0), 0);
  return (
    <>
      <nav className="m-bar" aria-label="Main">
        {main.map((item) => (
          <NavLink key={item.to} to={item.to} end className={tab(item)}>
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.badge > 0 && <b className="m-badge">{item.badge}</b>}
          </NavLink>
        ))}
        <button type="button" className={cx('m-tab', (more || restActive) && 'm-tab-on')} aria-expanded={more} aria-label="More" onClick={() => setMore((v) => !v)}>
          <Ellipsis size={20} />
          <span>More</span>
          {badgeTotal > 0 && <b className="m-badge">{badgeTotal}</b>}
        </button>
      </nav>
      {more && (
        <div className="m-sheet-wrap" role="dialog" aria-label="More">
          <div className="m-scrim" onClick={() => setMore(false)} />
          <div className="m-sheet">
            <div className="m-sheet-head"><b>More</b><button type="button" aria-label="Close" onClick={() => setMore(false)}><X size={18} /></button></div>
            <div className="m-grid">
              {rest.map((item) => (
                <NavLink key={item.to} to={item.to} end className={tab(item, 'm-tile')}>
                  <item.icon size={22} />
                  <span>{item.label}</span>
                  {item.badge > 0 && <b className="m-badge">{item.badge}</b>}
                </NavLink>
              ))}
            </div>
            <div className="m-actions">
              {onProject && <button type="button" onClick={() => { setMore(false); onProject(); }}><Settings size={18} /> {projectLabel}</button>}
              <button type="button" onClick={() => { setMore(false); onTheme(); }}><Palette size={18} /> Theme</button>
              <button type="button" onClick={onLogout}><LogOut size={18} /> Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileNav;
