

import React, { useState } from 'react';
import type { Signal, UserProfile, CurrentUserProfile } from '../types';
import SignalCard from './SignalCard';
import { useLanguage } from './LanguageProvider';
import { ArrowLeftIcon, VerifiedIcon, UserPlusIcon, UserCheckIcon, CopyIcon, CheckIcon, EditIcon, UserCircleIcon, CpuIcon, SettingsIcon } from './icons';

interface ProfileViewProps {
  profile: UserProfile;
  signals: Signal[];
  isFollowing: boolean;
  isCurrentUser: boolean;
  currentUserFollowers: Set<string>;
  onToggleFollow: (profile: UserProfile) => void;
  onReturnToFeed: () => void;
  onEditProfile: () => void;
  onOpenMobileSettings?: () => void;
  currentUserProfile: CurrentUserProfile;
  onInteract: (signalId: string, type: 'like' | 'repost' | 'comment') => void;
  userInteractions: { liked: Set<string> };
  onSelectSignal: (signal: Signal) => void;
  onViewProfile: (profile: UserProfile) => void;
  onRequestAnalysis: (signalId: string) => void;
  onDeleteSignal: (signal: Signal) => void;
  likingSignals: Set<string>;
  onTranslateSignal: (signalId: string) => void;
  translatingSignalId: string | null;
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};

const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  signals,
  isFollowing,
  isCurrentUser,
  currentUserFollowers,
  onToggleFollow,
  onReturnToFeed,
  onEditProfile,
  onOpenMobileSettings,
  currentUserProfile,
  likingSignals,
  onTranslateSignal,
  translatingSignalId,
  ...signalCardProps
}) => {
  const { t } = useLanguage();
  const [isCopied, setIsCopied] = useState(false);
  const followsYou = !isCurrentUser && currentUserFollowers.has(profile.id);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(profile.walletHash);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderFollowButton = () => {
    if (isCurrentUser) {
      return (
        <div className="flex items-center space-x-2">
            <button 
              onClick={onEditProfile}
              className="px-4 py-1.5 text-sm font-bold border border-light-border dark:border-krypton-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-krypton-gray-700 transition-colors flex items-center space-x-2"
            >
              <EditIcon className="w-4 h-4" />
              <span>{t('profile_edit')}</span>
            </button>
            <button
              onClick={onOpenMobileSettings}
              className="p-2 text-sm font-bold border border-light-border dark:border-krypton-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-krypton-gray-700 transition-colors md:hidden"
              aria-label="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
        </div>
      );
    }
    
    if (isFollowing) {
      return (
        <button
          onClick={() => onToggleFollow(profile)}
          className="px-4 py-1.5 text-sm font-bold border border-krypton-blue-500 text-krypton-blue-500 rounded-full flex items-center space-x-2 hover:bg-krypton-blue-500/10 transition-colors"
        >
          <UserCheckIcon className="w-4 h-4" />
          <span>{t('profile_following')}</span>
        </button>
      );
    }
    return (
      <button
        onClick={() => onToggleFollow(profile)}
        className="px-4 py-1.5 text-sm font-bold bg-krypton-blue-500 text-white rounded-full flex items-center space-x-2 hover:bg-krypton-blue-600 transition-colors"
      >
        <UserPlusIcon className="w-4 h-4" />
        <span>{t('profile_follow')}</span>
      </button>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button onClick={onReturnToFeed} className="p-2 mr-4 rounded-full hover:bg-gray-100 dark:hover:bg-krypton-gray-700">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{profile.name}</h1>
          <p className="text-sm text-light-text-secondary dark:text-krypton-gray-400">{signals.length} {t('profile_posts')}</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl p-5 relative mt-8">
        <div className="flex justify-between items-start">
            <div className="w-20 h-20 -mt-14">
                {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full rounded-full border-4 border-light-bg dark:border-krypton-gray-900" />
                ) : (
                    <UserCircleIcon className="w-full h-full text-krypton-gray-500 border-4 border-light-bg dark:border-krypton-gray-900 rounded-full" />
                )}
            </div>
            {renderFollowButton()}
        </div>
        
        <div className="mt-2">
            <div className="flex items-center">
                <h2 className="text-lg font-extrabold">{profile.name}</h2>
                {profile.isVerified && <VerifiedIcon className="w-5 h-5 text-krypton-blue-500 ml-1.5" />}
                {profile.isBot && (
                    <div className="ml-2 flex items-center space-x-1.5 bg-gray-200 dark:bg-krypton-gray-700 px-2 py-0.5 rounded-md">
                        <CpuIcon className="w-3.5 h-3.5 text-light-text-secondary dark:text-krypton-gray-400" />
                        <span className="text-xs font-semibold text-light-text-secondary dark:text-krypton-gray-400">Bot</span>
                    </div>
                )}
            </div>
            <div className="flex items-center space-x-2">
                <p className="text-sm text-light-text-secondary dark:text-krypton-gray-500">{profile.handle}</p>
                {followsYou && (
                    <span className="text-xs font-medium bg-gray-200 dark:bg-krypton-gray-700 text-light-text-secondary dark:text-krypton-gray-400 px-1.5 py-0.5 rounded-md">
                        {t('profile_follows_you')}
                    </span>
                )}
            </div>
            <div className="mt-1 flex items-center space-x-2 group cursor-pointer" onClick={handleCopyHash}>
                <span className="font-mono text-xs text-light-text-secondary dark:text-krypton-gray-400 group-hover:text-krypton-blue-500 transition-colors">
                    {`${profile.walletHash.substring(0, 6)}...${profile.walletHash.substring(profile.walletHash.length - 4)}`}
                </span>
                <div className="relative w-4 h-4">
                  {isCopied ? (
                      <CheckIcon className="w-4 h-4 text-krypton-success animate-fade-in" />
                  ) : (
                      <CopyIcon className="w-4 h-4 text-light-text-secondary dark:text-krypton-gray-500 group-hover:text-krypton-blue-500 transition-colors" />
                  )}
                </div>
            </div>
        </div>

        <p className="mt-3 text-base text-light-text-primary dark:text-krypton-gray-300 whitespace-pre-wrap">{profile.bio}</p>

        <div className="flex items-center space-x-4 mt-4 text-sm text-light-text-secondary dark:text-krypton-gray-400">
            <p><span className="font-bold text-light-text-primary dark:text-white">{formatNumber(profile.following)}</span> {t('profile_following_stat')}</p>
            <p><span className="font-bold text-light-text-primary dark:text-white">{formatNumber(profile.followers)}</span> {t('profile_followers')}</p>
        </div>
      </div>
      
      {/* Signals Feed */}
      <div className="mt-6">
        <h3 className="text-lg font-bold px-2 mb-2">{t('profile_posts')}</h3>
        <div className="space-y-6">
          {signals.length > 0 ? (
            signals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                currentUserProfile={currentUserProfile}
                {...signalCardProps}
                isLiked={signalCardProps.userInteractions.liked.has(signal.id)}
                isLiking={likingSignals.has(signal.id)}
                onTranslateSignal={onTranslateSignal}
                isTranslating={translatingSignalId === signal.id}
              />
            ))
          ) : (
            <div className="text-center py-10 text-light-text-secondary dark:text-krypton-gray-400">
                <p>{t('profile_no_signals_yet', { handle: profile.handle })}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
