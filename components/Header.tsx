import React, { useState, useRef, useEffect } from 'react';
import type { CurrentUserProfile, UserProfile, Notification } from '../types';
import { WalletIcon, SunIcon, MoonIcon, BellIcon, UserCircleIcon, SearchIcon, XIcon, GitCommitIcon, CopyIcon, CheckIcon } from './icons';
import { useLanguage } from './LanguageProvider';
import { useTheme } from './ThemeProvider';
import NotificationPanel from './NotificationPanel';
import SearchPanel from './SearchPanel';
import { useAuth } from './AuthProvider';
import { searchUsers } from '../services/firebase';

interface HeaderProps {
  userProfile: CurrentUserProfile;
  onViewProfile: (profile: UserProfile) => void;
  onEditProfile: () => void;
  notifications: Notification[];
  onMarkNotificationsAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  onClearNotifications: () => void;
  onViewBlockchain: () => void;
  currentView: 'feed' | 'profile' | 'blockchain';
  blockchainSearchTerm: string;
  onBlockchainSearchChange: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  userProfile, 
  onViewProfile,
  onEditProfile,
  notifications,
  onMarkNotificationsAsRead,
  onNotificationClick,
  onClearNotifications,
  onViewBlockchain,
  currentView,
  blockchainSearchTerm,
  onBlockchainSearchChange,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { logout, connectWallet, walletAddress, disconnectWallet, atsBalance } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [isCopied, setIsCopied] = useState(false);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isBlockchainView = currentView === 'blockchain';
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (isBlockchainView) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    if (userSearchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearchPanelOpen(true);
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(userSearchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [userSearchQuery, isBlockchainView]);


  const handleTogglePanel = () => {
    if (!isPanelOpen && unreadCount > 0) {
      onMarkNotificationsAsRead();
    }
    setIsPanelOpen(prev => !prev);
  };

  const handleNotificationItemClick = (notification: Notification) => {
    onNotificationClick(notification);
    setIsPanelOpen(false);
  }
  
  const handleSelectProfile = (profile: UserProfile) => {
    onViewProfile(profile);
    setUserSearchQuery('');
    setSearchResults([]);
    setIsSearchPanelOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
            setIsProfileMenuOpen(false);
        }
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
            setIsSearchPanelOpen(false);
            setUserSearchQuery('');
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (isBlockchainView) {
        onBlockchainSearchChange(value);
    } else {
        if (!value.startsWith('@')) {
            setUserSearchQuery('@' + value.replace(/@/g, ''));
        } else {
            setUserSearchQuery(value);
        }
    }
  };

  const handleSearchFocus = () => {
      if (!isBlockchainView) {
          setIsSearchPanelOpen(true);
          if (!userSearchQuery) {
              setUserSearchQuery('@');
          }
      }
  };
  
  const clearSearch = () => {
      if (isBlockchainView) {
        onBlockchainSearchChange('');
      } else {
        setUserSearchQuery('');
      }
  }
  
  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const langButtonClasses = (lang: 'pt' | 'en') => 
    `px-3 py-1 text-sm font-bold rounded-md transition-colors ${
      language === lang 
      ? 'bg-krypton-blue-500 text-white' 
      : 'bg-gray-200 text-gray-500 hover:bg-gray-300 dark:bg-krypton-gray-700 dark:text-krypton-gray-400 dark:hover:bg-krypton-gray-600'
    }`;

  const logoUrl = theme === 'dark' 
    ? 'https://i.ibb.co/j9YQ9Scq/branco.png' 
    : 'https://i.ibb.co/9k52WkvX/preto.png';

  const searchPlaceholder = isBlockchainView ? 'Search by Hash...' : t('header_search_placeholder');
  const searchValue = isBlockchainView ? blockchainSearchTerm : userSearchQuery;

  return (
    <header className="bg-light-bg/80 dark:bg-krypton-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-light-border dark:border-krypton-gray-700">
      <div className="container mx-auto px-4">
        <div className="hidden md:flex justify-between items-center h-16">
          <div className="flex items-center flex-1">
             <img src={logoUrl} alt="APOLO Logo" className="h-8" />
          </div>

           <div className="flex-1 flex justify-center px-4" ref={searchRef}>
            <div className="relative w-full max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-krypton-gray-500 dark:text-krypton-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    className="block w-full bg-gray-100 dark:bg-krypton-gray-900/50 border border-transparent dark:border-krypton-gray-700 rounded-full py-2 pl-10 pr-10 focus:outline-none focus:ring-1 focus:ring-krypton-blue-500 transition-colors"
                />
                {searchValue && (searchValue !== '@' || isBlockchainView) && (
                    <button 
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                        <XIcon className="h-5 w-5 text-krypton-gray-500 dark:text-krypton-gray-400 hover:text-light-text-primary dark:hover:text-white" />
                    </button>
                )}
                {isSearchPanelOpen && !isBlockchainView && (userSearchQuery.length > 1 || isSearching) && (
                   <SearchPanel 
                    results={searchResults}
                    isLoading={isSearching}
                    onSelectProfile={handleSelectProfile}
                   />
                )}
            </div>
           </div>

          <div className="flex items-center space-x-4 flex-1 justify-end">
             <div className="flex items-center space-x-2 bg-gray-100 dark:bg-krypton-gray-900/50 p-1 rounded-lg">
              <button onClick={() => setLanguage('pt')} className={langButtonClasses('pt')}>
                PT
              </button>
              <button onClick={() => setLanguage('en')} className={langButtonClasses('en')}>
                EN
              </button>
            </div>
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full bg-gray-200 dark:bg-krypton-gray-700 text-light-text-primary dark:text-krypton-gray-400 hover:bg-gray-300 dark:hover:bg-krypton-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="w-5 h-5 text-krypton-accent" /> : <MoonIcon className="w-5 h-5 text-krypton-purple" />}
            </button>
            <div className="relative">
              <button 
                onClick={handleTogglePanel}
                className="p-2 rounded-full bg-gray-200 dark:bg-krypton-gray-700 text-light-text-primary dark:text-krypton-gray-400 hover:bg-gray-300 dark:hover:bg-krypton-gray-600 transition-colors"
                aria-label="Toggle notifications"
              >
                  <BellIcon className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-krypton-danger text-white text-xs font-bold">
                      {unreadCount}
                    </span>
                  )}
              </button>
              {isPanelOpen && (
                <NotificationPanel 
                  notifications={notifications}
                  onNotificationClick={handleNotificationItemClick}
                  onClearAll={onClearNotifications}
                  onClose={() => setIsPanelOpen(false)}
                />
              )}
            </div>
            
            <div className="relative" ref={profileMenuRef}>
              <button onClick={() => setIsProfileMenuOpen(prev => !prev)} aria-label="Profile menu">
                 {userProfile.avatarUrl ? (
                    <img 
                        src={userProfile.avatarUrl} 
                        alt={userProfile.name} 
                        className="w-10 h-10 rounded-full border-2 border-krypton-blue-600 hover:opacity-80 transition-opacity"
                    />
                 ) : (
                    <UserCircleIcon className="w-10 h-10 rounded-full border-2 border-krypton-blue-600 text-krypton-gray-500" />
                 )}
              </button>
              {isProfileMenuOpen && (
                <div className="absolute top-12 right-0 w-64 bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-lg shadow-2xl animate-fade-in z-50">
                   {walletAddress ? (
                       <>
                        <div className="px-4 py-3 border-b border-light-border dark:border-krypton-gray-700">
                           <div className="flex items-center justify-between">
                                <p className="text-xs text-light-text-secondary dark:text-krypton-gray-400">Conectado como</p>
                                {atsBalance !== null && (
                                    <div className="bg-krypton-purple/20 text-krypton-purple dark:text-purple-400 px-2 py-0.5 rounded-md text-xs font-bold">
                                        {atsBalance} ATS
                                    </div>
                                )}
                           </div>
                           <div className="flex items-center mt-1">
                                <p className="font-mono text-sm font-bold truncate">{`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</p>
                                <button onClick={handleCopyAddress} className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-krypton-gray-700">
                                    {isCopied ? <CheckIcon className="w-4 h-4 text-krypton-success"/> : <CopyIcon className="w-4 h-4 text-krypton-gray-500" />}
                                </button>
                           </div>
                        </div>
                        <button 
                            onClick={() => {
                                onViewProfile(userProfile);
                                setIsProfileMenuOpen(false);
                            }} 
                            className="w-full text-left px-4 py-2 text-sm text-light-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-krypton-gray-700"
                        >
                            Ver Perfil
                        </button>
                        <button 
                            onClick={() => {
                                onEditProfile();
                                setIsProfileMenuOpen(false);
                            }} 
                            className="w-full text-left px-4 py-2 text-sm text-light-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-krypton-gray-700"
                        >
                            Editar Perfil
                        </button>
                        <button 
                            onClick={() => {
                                onViewBlockchain();
                                setIsProfileMenuOpen(false);
                            }} 
                            className="w-full text-left px-4 py-2 text-sm text-light-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-krypton-gray-700 flex items-center"
                        >
                            <GitCommitIcon className="w-4 h-4 mr-2"/>
                            Blockchain
                        </button>
                        <div className="border-t border-light-border dark:border-krypton-gray-700 my-1"></div>
                         <button 
                            onClick={() => {
                                disconnectWallet();
                                setIsProfileMenuOpen(false);
                            }} 
                            className="w-full text-left px-4 py-2 text-sm text-krypton-danger hover:bg-gray-100 dark:hover:bg-krypton-gray-700"
                            >
                            Desconectar Carteira
                        </button>
                       </>
                   ) : (
                        <button 
                            onClick={() => {
                                connectWallet();
                                setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-sm text-light-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-krypton-gray-700"
                        >
                            <WalletIcon className="w-5 h-5 mr-3 text-krypton-accent"/>
                            <span className="font-semibold">Conectar Carteira</span>
                        </button>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="flex md:hidden justify-center items-center h-16">
          <img src={logoUrl} alt="APOLO Logo" className="h-7" />
        </div>
      </div>
    </header>
  );
};

export default Header;