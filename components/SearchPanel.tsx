import React from 'react';
import type { UserProfile } from '../types';
import { LoaderIcon, UserCircleIcon, VerifiedIcon } from './icons';
import { useLanguage } from './LanguageProvider';

interface SearchPanelProps {
  results: UserProfile[];
  isLoading: boolean;
  onSelectProfile: (profile: UserProfile) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ results, isLoading, onSelectProfile }) => {
  const { t } = useLanguage();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-4">
          <LoaderIcon className="w-6 h-6 animate-spin text-krypton-blue-500" />
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="p-4 text-center text-sm text-light-text-secondary dark:text-krypton-gray-400">
          {t('search_no_results')}
        </div>
      );
    }

    return (
      <ul>
        {results.map(profile => (
          <li key={profile.id}>
            <button
              onClick={() => onSelectProfile(profile)}
              className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 transition-colors"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-10 h-10 rounded-full" />
              ) : (
                <UserCircleIcon className="w-10 h-10 text-krypton-gray-500" />
              )}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center">
                    <p className="font-bold text-sm truncate">{profile.name}</p>
                    {profile.isVerified && <VerifiedIcon className="w-4 h-4 text-krypton-blue-500 ml-1 flex-shrink-0" />}
                </div>
                <p className="text-sm text-light-text-secondary dark:text-krypton-gray-400 truncate">{profile.handle}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="absolute top-12 left-0 right-0 mt-1 bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl shadow-2xl animate-fade-in z-50 overflow-hidden">
      <div className="max-h-80 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default SearchPanel;
