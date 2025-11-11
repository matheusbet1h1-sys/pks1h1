import React from 'react';
import { useLanguage } from './LanguageProvider';
import { FilterIcon } from './icons';

type ActiveFeed = 'forYou' | 'following';

interface FeedTabsProps {
  activeFeed: ActiveFeed;
  onSelectFeed: (feed: ActiveFeed) => void;
  onOpenFilters: () => void;
}

const FeedTabs: React.FC<FeedTabsProps> = ({ activeFeed, onSelectFeed, onOpenFilters }) => {
  const { t } = useLanguage();

  const TabButton: React.FC<{ feed: ActiveFeed, label: string }> = ({ feed, label }) => {
    const isActive = activeFeed === feed;
    return (
      <button
        onClick={() => onSelectFeed(feed)}
        className="w-full h-full flex justify-center items-center transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50"
      >
        <span
          className={`relative h-full flex items-center text-sm font-bold ${
            isActive
              ? 'text-light-text-primary dark:text-white'
              : 'text-light-text-secondary dark:text-krypton-gray-400'
          }`}
        >
          {label}
          {isActive && (
            <span className="absolute bottom-0 left-0 w-full h-1 bg-krypton-blue-500 rounded-full" />
          )}
        </span>
      </button>
    );
  };

  return (
    <nav className="relative sticky top-16 z-40 bg-light-bg/80 dark:bg-krypton-gray-900/80 backdrop-blur-sm border-b border-light-border dark:border-krypton-gray-700 h-14">
      <div className="flex justify-around items-center h-full">
        <TabButton feed="forYou" label={t('feed_tab_for_you')} />
        <TabButton feed="following" label={t('feed_tab_following')} />
      </div>
       <button onClick={onOpenFilters} className="absolute top-0 right-0 h-full px-4 flex items-center md:hidden" aria-label="Open filters">
        <FilterIcon className="w-5 h-5 text-light-text-secondary dark:text-krypton-gray-400" />
      </button>
    </nav>
  );
};

export default FeedTabs;