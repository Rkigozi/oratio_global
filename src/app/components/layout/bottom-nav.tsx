import { Globe, Heart, PenLine, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { preloadRoutePath } from '../../route-loaders';

const navItems = [
  { path: '/', label: 'Map', icon: Globe },
  { path: '/feed', label: 'Feed', icon: Heart },
  { path: '/submit', label: 'Submit', icon: PenLine },
  { path: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav-safe fixed bottom-0 left-0 right-0 z-40">
      <div className="bottom-nav-inner max-w-lg mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const isActive =
            item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              aria-label={item.label}
              onFocus={() => preloadRoutePath(item.path)}
              onPointerEnter={() => preloadRoutePath(item.path)}
              onTouchStart={() => preloadRoutePath(item.path)}
              onClick={() => void navigate(item.path)}
              className={`bottom-nav-item relative flex flex-col items-center justify-center cursor-pointer ${isActive ? 'bottom-nav-item-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={21}
                className={`bottom-nav-icon ${isActive ? 'text-accent' : 'text-text-muted'}`}
                strokeWidth={isActive ? 2.4 : 1.9}
              />
              <span
                className={`bottom-nav-label text-[10px] leading-none mt-0.5 ${isActive ? 'text-accent' : 'text-text-muted'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
