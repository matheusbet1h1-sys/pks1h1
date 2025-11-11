import React from 'react';
import { HomeIcon, SearchIcon, PlusCircleIcon, BellIcon, UserCircleIcon } from './icons';

interface BottomNavBarProps {
  activeView: 'feed' | 'profile';
  onNavigate: (view: 'feed' | 'profile' | 'search' | 'notifications' | 'create') => void;
  unreadCount: number;
  avatarUrl: string;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  hasBadge?: boolean;
}> = ({ icon, activeIcon, isActive, onClick, hasBadge }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center w-full h-full text-krypton-gray-500 dark:text-krypton-gray-400 transition-colors duration-200">
    <div className="relative">
      <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
        {isActive ? activeIcon : icon}
      </div>
      {hasBadge && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-krypton-danger opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-krypton-danger"></span>
        </span>
      )}
    </div>
  </button>
);


const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, onNavigate, unreadCount, avatarUrl }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-light-card/80 dark:bg-krypton-gray-800/80 backdrop-blur-sm border-t border-light-border dark:border-krypton-gray-700 flex md:hidden z-50">
      <NavItem
        icon={<HomeIcon className="w-7 h-7" />}
        activeIcon={<HomeIcon className="w-7 h-7 text-krypton-blue-500" strokeWidth={2.5}/>}
        isActive={activeView === 'feed'}
        onClick={() => onNavigate('feed')}
      />
      <NavItem
        icon={<SearchIcon className="w-7 h-7" />}
        activeIcon={<SearchIcon className="w-7 h-7 text-krypton-blue-500" strokeWidth={2.5} />}
        isActive={false} // Search is a modal, not a persistent view
        onClick={() => onNavigate('search')}
      />
       <div className="w-full flex items-center justify-center">
         <button onClick={() => onNavigate('create')} className="bg-krypton-blue-600 rounded-full p-3 text-white hover:bg-krypton-blue-500 transition-all duration-200 hover:scale-110 -mt-5 shadow-lg shadow-krypton-blue-500/30">
           <PlusCircleIcon className="w-8 h-8" />
         </button>
       </div>
      <NavItem
        icon={<BellIcon className="w-7 h-7" />}
        activeIcon={<BellIcon className="w-7 h-7 text-krypton-blue-500" strokeWidth={2.5} />}
        isActive={false} // Notifications is a panel
        onClick={() => onNavigate('notifications')}
        hasBadge={unreadCount > 0}
      />
       <button onClick={() => onNavigate('profile')} className="flex flex-col items-center justify-center w-full h-full text-krypton-gray-500 dark:text-krypton-gray-400">
         <div className={`transition-transform duration-200 ${activeView === 'profile' ? 'scale-110' : 'scale-100'}`}>
             {avatarUrl ? (
                <img src={avatarUrl} alt="Your profile" className={`w-7 h-7 rounded-full border-2 ${activeView === 'profile' ? 'border-krypton-blue-500' : 'border-transparent'}`} />
             ) : (
                <UserCircleIcon className={`w-7 h-7 ${activeView === 'profile' ? 'text-krypton-blue-500' : ''}`} />
             )}
         </div>
      </button>
    </div>
  );
};

export default BottomNavBar;
