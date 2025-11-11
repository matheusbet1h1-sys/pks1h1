import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import { searchUsers } from '../services/firebase';
import { useLanguage } from './LanguageProvider';
import { ArrowLeftIcon, LoaderIcon, SearchIcon, XIcon, UserCircleIcon, VerifiedIcon } from './icons';

interface MobileSearchProps {
  onClose: () => void;
  onSelectProfile: (profile: UserProfile) => void;
}

const MobileSearch: React.FC<MobileSearchProps> = ({ onClose, onSelectProfile }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setQuery('@');
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const handler = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await searchUsers(query);
        setResults(searchResults);
      } catch (error) {
        console.error("Error searching users:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSelect = (profile: UserProfile) => {
    onSelectProfile(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-light-bg dark:bg-krypton-gray-900 z-[100] animate-fade-in flex flex-col md:hidden">
      <header className="flex items-center p-2 border-b border-light-border dark:border-krypton-gray-700 flex-shrink-0">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-krypton-gray-800">
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <div className="relative flex-1 mx-2">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-krypton-gray-500 dark:text-krypton-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('header_search_placeholder')}
              value={query}
              onChange={(e) => {
                let value = e.target.value;
                if (!value.startsWith('@')) {
                    setQuery('@' + value.replace(/@/g, ''));
                } else {
                    setQuery(value);
                }
              }}
              autoFocus
              className="w-full bg-gray-100 dark:bg-krypton-gray-800 border border-transparent rounded-full py-2 pl-10 pr-10 focus:outline-none focus:ring-1 focus:ring-krypton-blue-500"
            />
             {query && query !== '@' && (
                <button 
                  onClick={() => setQuery('@')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                    <XIcon className="h-5 w-5 text-krypton-gray-500 hover:text-light-text-primary" />
                </button>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {isLoading && (
            <div className="flex justify-center items-center p-8">
                <LoaderIcon className="w-8 h-8 animate-spin text-krypton-blue-500" />
            </div>
        )}
        {!isLoading && query.length >= 2 && results.length === 0 && (
             <div className="p-8 text-center text-light-text-secondary dark:text-krypton-gray-400">
                {t('search_no_results')}
            </div>
        )}
        <ul>
            {results.map(profile => (
                <li key={profile.id}>
                    <button
                        onClick={() => handleSelect(profile)}
                        className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 transition-colors"
                    >
                         {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={profile.name} className="w-10 h-10 rounded-full" />
                        ) : (
                            <UserCircleIcon className="w-10 h-10 text-krypton-gray-500" />
                        )}
                        <div>
                             <div className="flex items-center">
                                <p className="font-bold text-sm">{profile.name}</p>
                                {profile.isVerified && <VerifiedIcon className="w-4 h-4 text-krypton-blue-500 ml-1" />}
                            </div>
                            <p className="text-sm text-light-text-secondary dark:text-krypton-gray-400">{profile.handle}</p>
                        </div>
                    </button>
                </li>
            ))}
        </ul>
         {query.length <= 1 && (
            <div className="p-4">
                <h3 className="text-lg font-bold mb-4 px-2">{t('trending_title')}</h3>
                 <ul className="space-y-2 text-light-text-secondary dark:text-krypton-gray-400">
                    <li className="p-2 hover:bg-gray-100 dark:hover:bg-krypton-gray-800 rounded-md">#BitcoinHalving</li>
                    <li className="p-2 hover:bg-gray-100 dark:hover:bg-krypton-gray-800 rounded-md">$ETH ETF</li>
                    <li className="p-2 hover:bg-gray-100 dark:hover:bg-krypton-gray-800 rounded-md">#DeFi</li>
                </ul>
            </div>
         )}
      </main>
    </div>
  );
};

export default MobileSearch;