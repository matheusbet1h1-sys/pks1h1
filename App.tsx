


import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import type { Signal, CurrentUserProfile, UserProfile, SignalFilters, SignalType, Comment, Notification } from './types';
import { fetchRealSignals, analyzePostSafety, translateSignal } from './services/geminiService';
import Header from './components/Header';
import SignalCard from './components/SignalCard';
import CreateSignalForm from './components/CreateSignalForm';
import DashboardControls from './components/DashboardControls';
import SignalModal from './components/SignalModal';
import ProfileView from './components/ProfileView';
import FeedTabs from './components/FeedTabs';
import { LoaderIcon, AlertTriangleIcon, XIcon, SunIcon, MoonIcon, GitCommitIcon } from './components/icons';
import { useLanguage } from './components/LanguageProvider';
import { useAuth } from './components/AuthProvider';
import AuthView from './components/AuthView';
import OnboardingView from './components/OnboardingView';
import EditProfileModal from './components/EditProfileModal';
import { 
    getFollowingIds, toggleFollow, createNotification, getNotificationsListener, 
    markAllNotificationsAsRead, clearAllNotifications, createSignal, getSignalsListener,
    addCommentToSignal, getUserInteractions, toggleInteraction, getUserProfile, getFollowerIds,
    updateSignalAnalysis, deleteSignal, clearCointelegraphAnalyses, getOrCreateCointelegraphProfile
} from './services/firebase';
import BottomNavBar from './components/BottomNavBar';
import MobileSearch from './components/MobileSearch';
import NotificationPanel from './components/NotificationPanel';
import RecoveryInfoModal from './components/RecoveryInfoModal';
import ConfirmationModal from './components/ConfirmationModal';
import RepostModal from './components/RepostModal';
import { useTheme } from './components/ThemeProvider';
import BlockchainPage from './blockchain/BlockchainPage';


type ActiveFeed = 'forYou' | 'following';
type AppView = 'feed' | 'profile' | 'blockchain';

const MobilePanel: React.FC<{isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, noPadding?: boolean}> = ({isOpen, onClose, title, children, noPadding = false}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-krypton-gray-900/50 backdrop-blur-sm z-[100] animate-fade-in md:hidden" onClick={onClose}>
            <div className="absolute bottom-0 left-0 right-0 bg-light-card dark:bg-krypton-gray-800 rounded-t-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-light-border dark:border-krypton-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="font-bold text-lg">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-krypton-gray-700">
                      <XIcon className="w-6 h-6"/>
                    </button>
                </header>
                <div className={`overflow-y-auto ${noPadding ? '' : 'p-4'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { currentUser, currentUserProfile: authCurrentUserProfile, loadingAuth, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(authCurrentUserProfile);
  const [cointelegraphProfile, setCointelegraphProfile] = useState<UserProfile | null>(null);

  const [firestoreSignals, setFirestoreSignals] = useState<Signal[]>([]);
  const [newsSignals, setNewsSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState({ feed: true });
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInteractions, setUserInteractions] = useState<{ liked: Set<string> }>({ liked: new Set() });
  const [filters, setFilters] = useState<SignalFilters>({
    trustScore: 0,
    types: [],
    tokenTags: []
  });
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [signalToScrollTo, setSignalToScrollTo] = useState<string | null>(null); // New state to trigger scroll
  const [currentView, setCurrentView] = useState<AppView>('feed');
  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [currentUserFollowers, setCurrentUserFollowers] = useState<Set<string>>(new Set());
  const [activeFeed, setActiveFeed] = useState<ActiveFeed>('forYou');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isRecoveryInfoModalOpen, setIsRecoveryInfoModalOpen] = useState(false);

  // State for mobile-only panels
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCreateSignalOpen, setIsCreateSignalOpen] = useState(false);
  const [isMobileNotificationsOpen, setIsMobileNotificationsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  // State for delete confirmation
  const [signalToDelete, setSignalToDelete] = useState<Signal | null>(null);
  // State for reposting
  const [signalToRepost, setSignalToRepost] = useState<Signal | null>(null);
  // State to prevent like button spamming
  const [likingSignals, setLikingSignals] = useState<Set<string>>(new Set());

  // State for on-demand translation
  const [translatedSignals, setTranslatedSignals] = useState(new Map<string, { title: string; content: string }>());
  const [translatingSignalId, setTranslatingSignalId] = useState<string | null>(null);

  // State for blockchain search
  const [blockchainSearchTerm, setBlockchainSearchTerm] = useState('');

  const scrollPositions = useRef<{ forYou: number, following: number }>({ forYou: 0, following: 0 });
  const prevOnboardingCompleted = useRef(currentUserProfile?.onboardingCompleted);

  // Fetch the canonical Cointelegraph profile to fix any malformed data from Firestore
  useEffect(() => {
    if (currentUserProfile?.onboardingCompleted) {
      getOrCreateCointelegraphProfile().then(setCointelegraphProfile);
    }
  }, [currentUserProfile?.onboardingCompleted]);

  // One-time effect to clear old analyses
  useEffect(() => {
    const hasCleared = localStorage.getItem('cointelegraphAnalysesCleared');
    if (!hasCleared && currentUserProfile?.onboardingCompleted) {
      console.log("Running one-time cleanup of Cointelegraph analyses...");
      clearCointelegraphAnalyses().then(() => {
        console.log("Cleanup complete.");
        localStorage.setItem('cointelegraphAnalysesCleared', 'true');
      }).catch(error => {
        console.error("Cleanup failed:", error);
      });
    }
  }, [currentUserProfile?.onboardingCompleted]);


  useEffect(() => {
    setCurrentUserProfile(authCurrentUserProfile);
  }, [authCurrentUserProfile]);
  
  useEffect(() => {
    if (prevOnboardingCompleted.current === false && currentUserProfile?.onboardingCompleted === true) {
      setCurrentView('feed');
      setViewedProfile(null);
      setIsRecoveryInfoModalOpen(true);
    }
    prevOnboardingCompleted.current = currentUserProfile?.onboardingCompleted;
  }, [currentUserProfile?.onboardingCompleted]);

  useEffect(() => {
    setCurrentView('feed');
    setViewedProfile(null);
    setActiveFeed('forYou');
    setSelectedSignal(null);
    scrollPositions.current = { forYou: 0, following: 0 };
    
    if (!currentUserProfile) {
        setFirestoreSignals([]);
        setNewsSignals([]); 
        setFollowedUsers(new Set());
        setCurrentUserFollowers(new Set());
        setUserInteractions({ liked: new Set() });
        setNotifications([]);
    }
  }, [currentUserProfile?.id]);

  const refreshFeed = useCallback(async (mode: 'initial' | 'refresh') => {
    if (!currentUser || !currentUserProfile?.onboardingCompleted) return;

    if (mode === 'initial') {
      setIsLoading(prev => ({ ...prev, feed: true }));
    } else {
      setIsRefreshingFeed(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setError(null);

    try {
        const news = await fetchRealSignals();
        setNewsSignals(news);
    } catch (e) {
        console.error(e);
        setError(t('error_fetch_feed'));
    } finally {
        if (mode === 'initial') {
          setIsLoading(prev => ({...prev, feed: false }));
        } else {
          setIsRefreshingFeed(false);
        }
    }
  }, [currentUser, currentUserProfile?.onboardingCompleted, t]);


  // Set up listeners and fetch initial data
  useEffect(() => {
    if (!currentUser || !currentUserProfile?.onboardingCompleted) return;
    
    const unsubscribeSignals = getSignalsListener((signalsFromDb) => {
        setFirestoreSignals(signalsFromDb);
    });
    
    refreshFeed('initial');

    return () => {
        unsubscribeSignals();
    };
  }, [currentUser, currentUserProfile?.onboardingCompleted, refreshFeed]);


  useEffect(() => {
    if (currentUserProfile?.id) {
      const fetchUserData = async () => {
        const [followingIds, followerIds, interactions] = await Promise.all([
          getFollowingIds(currentUserProfile.id),
          getFollowerIds(currentUserProfile.id),
          getUserInteractions(currentUserProfile.id)
        ]);
        setFollowedUsers(new Set(followingIds));
        setCurrentUserFollowers(new Set(followerIds));
        setUserInteractions({ liked: interactions.liked });
      };
      fetchUserData();
    }
  }, [currentUserProfile?.id]);

  useEffect(() => {
    if (currentUserProfile?.id) {
      const unsubscribe = getNotificationsListener(currentUserProfile.id, (fetchedNotifications) => {
        setNotifications(fetchedNotifications);
      });
      return () => unsubscribe();
    }
  }, [currentUserProfile?.id]);

  const signals = useMemo(() => {
      const signalMap = new Map<string, Signal>();
      
      // Load news signals first
      [...newsSignals].forEach(signal => signalMap.set(signal.id, signal));
      
      // Overwrite with any signals from Firestore (which are the source of truth for interactions)
      [...firestoreSignals].forEach(signal => signalMap.set(signal.id, signal));
      
      const all = Array.from(signalMap.values());
      all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // If the canonical Cointelegraph profile is loaded, patch all its signals
      // to ensure the avatar is always correct, fixing malformed data from Firestore.
      if (cointelegraphProfile) {
          return all.map(signal => 
              signal.author.id === cointelegraphProfile.id 
              ? { ...signal, author: cointelegraphProfile } 
              : signal
          );
      }

      return all;
  }, [firestoreSignals, newsSignals, cointelegraphProfile]);


  useEffect(() => {
    if (selectedSignal) {
        const updatedSignal = signals.find(s => s.id === selectedSignal.id);
        if (updatedSignal) {
             setSelectedSignal(updatedSignal);
        } else {
             setSelectedSignal(null);
        }
    }
  }, [signals, selectedSignal]);


  const handleFilterChange = (newFilters: Partial<SignalFilters>) => {
    setFilters(prev => ({...prev, ...newFilters}));
  };

  const allTokenTags = useMemo(() => {
    const tags = new Set<string>();
    signals.forEach(s => s.tokenTags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [signals]);

  const signalsToDisplay = useMemo(() => {
    if (!currentUserProfile) return [];
    
    const sourceSignals = activeFeed === 'following'
      ? signals.filter(signal => followedUsers.has(signal.author.id) && signal.author.id !== currentUserProfile.id)
      : signals;
    
    const filteredSignals = sourceSignals.filter(signal => {
      const { trustScore, types, tokenTags } = filters;
      if (signal.integrityAnalysis && signal.integrityAnalysis.trustScore < trustScore) return false;
      if (types.length > 0 && !types.includes(signal.type)) return false;
      if (tokenTags.length > 0 && !signal.tokenTags.some(tag => tokenTags.includes(tag))) return false;
      return true;
    });

    return filteredSignals.map(signal => {
        const translation = translatedSignals.get(signal.id);
        if (translation) {
            return {
                ...signal,
                title: translation.title,
                content: translation.content,
                isTranslated: true,
            };
        }
        return signal;
    });
  }, [signals, filters, activeFeed, followedUsers, currentUserProfile, translatedSignals]);

  const handleInteraction = async (signalId: string, type: 'like' | 'repost' | 'comment') => {
    if (!currentUserProfile) return;
  
    const signalToInteract = signals.find(s => s.id === signalId);
    if (!signalToInteract) return;
  
    if (type === 'comment') {
      setSelectedSignal(signalToInteract);
      return;
    }
  
    if (type === 'repost') {
      setSignalToRepost(signalToInteract);
      return;
    }
  
    // This logic is now only for 'like'
    if (likingSignals.has(signalId)) {
      return; // Debounce: If already liking, ignore the click.
    }
  
    setLikingSignals(prev => new Set(prev).add(signalId));
  
    // Optimistic UI update
    const isLiked = userInteractions.liked.has(signalId);
    const originalInteractions = { ...userInteractions };
    const newInteractions = {
      ...userInteractions,
      liked: new Set(userInteractions.liked)
    };
    if (isLiked) {
      newInteractions.liked.delete(signalId);
    } else {
      newInteractions.liked.add(signalId);
    }
    setUserInteractions(newInteractions);
  
    try {
      await toggleInteraction(signalToInteract, currentUserProfile, type);
    } catch (error) {
      console.error(`Failed to toggle ${type}:`, error);
      setError(t('error_like_update'));
      setUserInteractions(originalInteractions); // Revert on failure
    } finally {
      setLikingSignals(prev => {
        const newSet = new Set(prev);
        newSet.delete(signalId);
        return newSet;
      });
    }
  };
  
  const handleTranslateSignal = async (signalId: string) => {
    const signalToTranslate = signals.find(s => s.id === signalId);
    if (!signalToTranslate) return;

    setTranslatingSignalId(signalId);
    try {
        const translation = await translateSignal(signalToTranslate, language);
        setTranslatedSignals(prev => new Map(prev).set(signalId, translation));
    } catch (e) {
        console.error("Translation failed:", e);
        setError(t('error_translation_failed'));
    } finally {
        setTranslatingSignalId(null);
    }
  };

  const handleRequestAnalysis = async (signalId: string) => {
    const signalToAnalyze = signals.find(s => s.id === signalId);
    if (!signalToAnalyze || typeof signalToAnalyze.integrityAnalysis !== 'undefined') {
        return;
    }

    try {
      await updateSignalAnalysis(signalToAnalyze, null);
      
      const analysis = await analyzePostSafety(signalToAnalyze.title, signalToAnalyze.content, language);
      
      await updateSignalAnalysis(signalToAnalyze, analysis);

    } catch (e) {
      console.error(`Analysis process for signal ${signalId} failed:`, e);
      setError(t('error_ai_analysis'));
      
      try {
        await updateSignalAnalysis(signalToAnalyze, 'DELETE');
      } catch (resetError) {
        console.error(`Failed to reset analysis state for signal ${signalId}:`, resetError);
      }
    }
  };

  const handlePostSignal = async (newSignalData: Omit<Signal, 'id' | 'author' | 'timestamp' | 'stats' | 'integrityAnalysis' | 'comments'> & { quotedSignal?: Signal }) => {
    if (!currentUserProfile) return;
    
    setIsPosting(true);
    try {
        await createSignal(currentUserProfile, newSignalData);
        setIsCreateSignalOpen(false);
    } catch(error) {
        console.error("Failed to post signal:", error);
        setError(t('error_post_signal'));
    } finally {
        setIsPosting(false);
    }
  };
  
  const handleRequestDeleteSignal = (signal: Signal) => {
    if (!currentUserProfile || signal.author.id !== currentUserProfile.id) return;
    setSignalToDelete(signal);
  };

  const handleConfirmDelete = async () => {
    if (!signalToDelete) return;

    try {
        await deleteSignal(signalToDelete);
    } catch (error) {
        console.error("Failed to delete signal:", error);
        setError(t('error_delete_signal'));
    } finally {
        setSignalToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setSignalToDelete(null);
  };
  
  const handleSimpleRepost = async (originalSignal: Signal) => {
      if (!currentUserProfile) return;
      const newSignalData = {
          title: '', // Simple reposts have no title or content of their own
          content: '',
          tokenTags: originalSignal.tokenTags,
          type: 'SOCIAL_SENTIMENT' as SignalType,
          dataType: 'Repost',
          signalStrength: originalSignal.signalStrength,
          quotedSignal: originalSignal
      };
      await handlePostSignal(newSignalData);
      setSignalToRepost(null);
  };

  const handleQuoteRepost = async (originalSignal: Signal, quoteContent: string) => {
      if (!currentUserProfile) return;
      const newSignalData = {
          title: '', // Quote reposts don't have their own title
          content: quoteContent,
          tokenTags: originalSignal.tokenTags,
          type: 'SOCIAL_SENTIMENT' as SignalType,
          dataType: 'Quote Repost',
          signalStrength: originalSignal.signalStrength,
          quotedSignal: originalSignal
      };
      await handlePostSignal(newSignalData);
      setSignalToRepost(null);
  };


  const handleSelectSignal = (signal: Signal) => {
    setSelectedSignal(signal);
  };

  const handleCloseModal = () => {
      setSelectedSignal(null);
      setSignalToScrollTo(null);
  };

  const handlePostComment = async (signalId: string, content: string, replyingTo?: { authorId: string; authorHandle: string }) => {
      if (!currentUserProfile) return;

      const newCommentData: Omit<Comment, 'id' | 'replyingTo'> = {
          author: {
              id: currentUserProfile.id,
              name: currentUserProfile.name,
              handle: currentUserProfile.handle,
              avatarUrl: currentUserProfile.avatarUrl,
              isVerified: currentUserProfile.isVerified,
              bio: currentUserProfile.bio,
              followers: currentUserProfile.followers,
              following: currentUserProfile.following,
              walletHash: currentUserProfile.walletHash,
          },
          timestamp: new Date(),
          content: content,
      };

      const signalToUpdate = signals.find(s => s.id === signalId);
      if (!signalToUpdate) {
        console.error("Cannot post comment, signal not found in state:", signalId);
        setError(t('error_post_comment'));
        return;
      }

      try {
          await addCommentToSignal(signalToUpdate, newCommentData, replyingTo);

          if (signalToUpdate.author.id !== currentUserProfile.id) {
              createNotification(signalToUpdate.author.id, {
                  type: 'COMMENT',
                  actor: currentUserProfile,
                  signal: signalToUpdate,
              });
          }
      } catch (error) {
          console.error("Failed to post comment:", error);
          setError(t('error_post_comment'));
      }
  };


  const handleViewProfile = useCallback(async (profile: UserProfile) => {
    setCurrentView('profile');
    window.scrollTo(0, 0);

    if (currentUserProfile?.id === profile.id) {
      setViewedProfile(currentUserProfile);
      return;
    }
    
    try {
      const freshProfile = await getUserProfile(profile.id);
      setViewedProfile(freshProfile || profile);
    } catch (error) {
      console.error(`Failed to fetch profile for ${profile.id}:`, error);
      setViewedProfile(profile);
    }
  }, [currentUserProfile]);

  const handleReturnToFeed = useCallback(() => {
    setViewedProfile(null);
    setCurrentView('feed');
  }, []);

  const handleViewBlockchain = () => {
    setCurrentView('blockchain');
    setViewedProfile(null);
    window.scrollTo(0, 0);
  };

  const handleToggleFollow = useCallback(async (profileToToggle: UserProfile) => {
    if (!currentUserProfile) return;
    const userId = profileToToggle.id;
    if (userId === currentUserProfile.id) return;

    const isCurrentlyFollowing = followedUsers.has(userId);

    setFollowedUsers(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyFollowing) newSet.delete(userId); else newSet.add(userId);
        return newSet;
    });

    setCurrentUserProfile(prevProfile => {
        if (!prevProfile) return null;
        return { ...prevProfile, following: isCurrentlyFollowing ? prevProfile.following - 1 : prevProfile.following + 1 };
    });

    const updateUserFollowers = (user: UserProfile | null): UserProfile | null => {
        if (!user || user.id !== userId) return user;
        return { ...user, followers: isCurrentlyFollowing ? user.followers - 1 : user.followers + 1 };
    };

    setViewedProfile(updateUserFollowers);

    setFirestoreSignals(prevSignals => prevSignals.map(signal => ({
        ...signal,
        author: signal.author.id === userId ? updateUserFollowers(signal.author) as UserProfile : signal.author,
    })));

    try {
        await toggleFollow(currentUserProfile.id, userId, isCurrentlyFollowing);
        if (!isCurrentlyFollowing) {
            createNotification(profileToToggle.id, {
                type: 'FOLLOW',
                actor: currentUserProfile,
                targetUser: profileToToggle,
            });
        }
    } catch (error) {
        console.error("Failed to update follow status:", error);
        setError(t('error_follow_update'));

        setFollowedUsers(prev => {
            const newSet = new Set(prev);
            if (isCurrentlyFollowing) newSet.add(userId); else newSet.delete(userId);
            return newSet;
        });

        setCurrentUserProfile(prevProfile => {
            if (!prevProfile) return null;
            return { ...prevProfile, following: isCurrentlyFollowing ? prevProfile.following + 1 : prevProfile.following - 1 };
        });

        const rollbackUserFollowers = (user: UserProfile | null): UserProfile | null => {
            if (!user || user.id !== userId) return user;
            return { ...user, followers: isCurrentlyFollowing ? user.followers + 1 : user.followers - 1 };
        };
        
        setViewedProfile(rollbackUserFollowers);

        setFirestoreSignals(prevSignals => prevSignals.map(signal => ({
            ...signal,
            author: signal.author.id === userId ? rollbackUserFollowers(signal.author) as UserProfile : signal.author,
        })));
    }
  }, [currentUserProfile, followedUsers, t]);
  
  const handleSelectFeed = useCallback((newFeed: ActiveFeed) => {
    if (newFeed === activeFeed) {
        refreshFeed('refresh');
    } else {
        scrollPositions.current[activeFeed] = window.scrollY;
        setActiveFeed(newFeed);
    }
  }, [activeFeed, refreshFeed]);
  
  const handleMarkNotificationsAsRead = useCallback(async () => {
    if (!currentUserProfile?.id || notifications.filter(n => !n.read).length === 0) return;
    try {
        await markAllNotificationsAsRead(currentUserProfile.id);
    } catch (error) {
        console.error("Failed to mark notifications as read:", error);
    }
  }, [currentUserProfile?.id, notifications]);
  
  const handleNotificationClick = useCallback((notification: Notification) => {
    setIsMobileNotificationsOpen(false);
    if (notification.signal) {
      const freshSignal = signals.find(s => s.id === notification.signal!.id);
      const signalToShow = freshSignal || notification.signal;

      setSelectedSignal(signalToShow);

      if (notification.type === 'COMMENT') {
        setSignalToScrollTo(signalToShow.id);
      }
    } else if (notification.type === 'FOLLOW' && notification.actor) {
      handleViewProfile(notification.actor);
    }
  }, [handleViewProfile, signals]);

  const handleClearNotifications = useCallback(async () => {
     if (!currentUserProfile?.id) return;
     try {
        await clearAllNotifications(currentUserProfile.id);
     } catch (error) {
        console.error("Failed to clear notifications:", error);
     }
  }, [currentUserProfile?.id]);
  
  const handleMobileNavigate = (view: 'feed' | 'profile' | 'search' | 'notifications' | 'create') => {
    setIsMobileSearchOpen(false);
    setIsCreateSignalOpen(false);
    setIsMobileNotificationsOpen(false);

    switch(view) {
        case 'feed':
            handleReturnToFeed();
            break;
        case 'profile':
            if (currentUserProfile) handleViewProfile(currentUserProfile);
            break;
        case 'search':
            setIsMobileSearchOpen(true);
            break;
        case 'notifications':
            setIsMobileNotificationsOpen(true);
            handleMarkNotificationsAsRead();
            break;
        case 'create':
            setIsCreateSignalOpen(true);
            break;
    }
  };


  useLayoutEffect(() => {
    if (currentUserProfile?.onboardingCompleted && currentView === 'feed') {
        window.scrollTo({ top: scrollPositions.current[activeFeed], behavior: 'auto' });
    }
  }, [activeFeed, currentUserProfile?.onboardingCompleted, currentView]);
  
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-krypton-gray-900 flex justify-center items-center">
        <LoaderIcon className="w-16 h-16 animate-spin text-krypton-blue-500" />
      </div>
    );
  }

  if (!currentUser || !currentUserProfile) {
    return <AuthView />;
  }
  
  if (!currentUserProfile.onboardingCompleted) {
    return <OnboardingView />;
  }

  const renderFeed = () => {
    if (isLoading.feed && signals.length === 0) {
      return (
        <div className="flex justify-center items-center py-20">
          <LoaderIcon className="w-12 h-12 animate-spin text-krypton-blue-500" />
          <p className="ml-4 text-xl">{t('feed_loading')}</p>
        </div>
      );
    }
    
    if (signalsToDisplay.length === 0 && !isRefreshingFeed) {
        if (activeFeed === 'following') {
            const EmptyState = ({ title, subtitle }: {title: string, subtitle: string}) => (
                 <div className="text-center py-20 px-6">
                    <h3 className="text-xl font-bold text-light-text-primary dark:text-white">{title}</h3>
                    <p className="text-base text-light-text-secondary dark:text-krypton-gray-400 mt-2">{subtitle}</p>
                </div>
            );
            
            if (followedUsers.size === 0) {
                return <EmptyState title={t('feed_following_empty_title')} subtitle={t('feed_following_empty_subtitle')} />;
            }
            return <EmptyState title={t('feed_following_no_posts_title')} subtitle={t('feed_following_no_posts_subtitle')} />;
        }

        return (
            <div className="text-center py-20">
                <p className="text-lg text-light-text-secondary dark:text-krypton-gray-400">{t('feed_no_signals')}</p>
                <button 
                    onClick={() => handleFilterChange({ trustScore: 0, types: [], tokenTags: [] })}
                    className="mt-4 text-krypton-blue-500 hover:underline"
                >
                    {t('feed_reset_filters')}
                </button>
            </div>
        );
    }

    return signalsToDisplay.map((signal) => (
      <SignalCard 
        key={signal.id} 
        signal={signal} 
        currentUserProfile={currentUserProfile}
        onInteract={handleInteraction}
        isLiked={userInteractions.liked.has(signal.id)}
        isLiking={likingSignals.has(signal.id)}
        onSelectSignal={handleSelectSignal}
        onViewProfile={handleViewProfile}
        onRequestAnalysis={handleRequestAnalysis}
        onDeleteSignal={handleRequestDeleteSignal}
        onTranslateSignal={handleTranslateSignal}
        isTranslating={translatingSignalId === signal.id}
      />
    ));
  }

  const mainContent = () => {
    if (currentView === 'profile' && viewedProfile && currentUserProfile) {
      const isViewingCurrentUser = viewedProfile.id === currentUserProfile.id;
      const profileToDisplay = isViewingCurrentUser ? currentUserProfile : viewedProfile;
      
      const profileSignals = signalsToDisplay.filter(s => s.author.id === profileToDisplay.id);
      return (
        <ProfileView
          profile={profileToDisplay}
          signals={profileSignals}
          isFollowing={followedUsers.has(profileToDisplay.id)}
          isCurrentUser={isViewingCurrentUser}
          currentUserFollowers={currentUserFollowers}
          onToggleFollow={handleToggleFollow}
          onReturnToFeed={handleReturnToFeed}
          onEditProfile={() => setIsEditProfileModalOpen(true)}
          onOpenMobileSettings={() => setIsMobileSettingsOpen(true)}
          currentUserProfile={currentUserProfile}
          onInteract={handleInteraction}
          userInteractions={userInteractions}
          onSelectSignal={handleSelectSignal}
          onViewProfile={handleViewProfile}
          onRequestAnalysis={handleRequestAnalysis}
          onDeleteSignal={handleRequestDeleteSignal}
          likingSignals={likingSignals}
          onTranslateSignal={handleTranslateSignal}
          translatingSignalId={translatingSignalId}
        />
      );
    }

    // Default to feed view
    return (
      <>
        <FeedTabs 
          activeFeed={activeFeed} 
          onSelectFeed={handleSelectFeed} 
          onOpenFilters={() => setIsFiltersOpen(true)}
        />
         {isRefreshingFeed && (
            <div className="flex justify-center items-center py-4 border-b border-light-border dark:border-krypton-gray-700">
                <LoaderIcon className="w-6 h-6 animate-spin text-krypton-blue-500" />
            </div>
        )}
        <div className="mt-4 hidden md:block">
            <CreateSignalForm userProfile={currentUserProfile} onPost={handlePostSignal} isPosting={isPosting} />
        </div>
        <div className="mt-4 md:mt-8">
          <div className="space-y-6">
            {renderFeed()}
          </div>
        </div>
      </>
    );
  };
  
  return (
    <div className="min-h-screen bg-light-bg dark:bg-krypton-gray-900 pb-16 md:pb-0">
      <Header 
        userProfile={currentUserProfile} 
        onViewProfile={handleViewProfile}
        onEditProfile={() => setIsEditProfileModalOpen(true)}
        notifications={notifications}
        onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
        onNotificationClick={handleNotificationClick}
        onClearNotifications={handleClearNotifications}
        onViewBlockchain={handleViewBlockchain}
        currentView={currentView}
        blockchainSearchTerm={blockchainSearchTerm}
        onBlockchainSearchChange={setBlockchainSearchTerm}
      />
      <main className="container mx-auto px-4 py-8">
         {currentView === 'blockchain' ? (
            <BlockchainPage searchTerm={blockchainSearchTerm} />
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="hidden md:block col-span-1">
                    <div className="sticky top-24">
                        <DashboardControls 
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        allTokenTags={allTokenTags}
                        />
                    </div>
                </aside>

                <div className="col-span-1 md:col-span-2">
                    {mainContent()}
                </div>

                <aside className="hidden md:block col-span-1">
                    <div className="sticky top-24 bg-light-card dark:bg-krypton-gray-800 p-4 rounded-xl border border-light-border dark:border-krypton-gray-700">
                        <h2 className="text-lg font-bold mb-4">{t('trending_title')}</h2>
                        <ul className="space-y-2 text-light-text-secondary dark:text-krypton-gray-400">
                        <li>#BitcoinHalving</li>
                        <li>$ETH ETF</li>
                        <li>#DeFi</li>
                        </ul>
                    </div>
                </aside>
            </div>
        )}

        {error && (
          <div className="fixed bottom-20 md:bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-krypton-danger dark:text-white p-4 rounded-lg shadow-lg flex items-center max-w-sm animate-fade-in">
            <AlertTriangleIcon className="w-6 h-6 mr-3 text-krypton-danger" />
            <p>{error}</p>
          </div>
        )}
      </main>

      {selectedSignal && (
          <SignalModal
            signal={selectedSignal}
            userProfile={currentUserProfile}
            onClose={handleCloseModal}
            onPostComment={handlePostComment}
            onViewProfile={handleViewProfile}
            onDeleteSignal={handleRequestDeleteSignal}
            scrollToComments={selectedSignal.id === signalToScrollTo}
          />
      )}
      
      {signalToRepost && (
        <RepostModal
            signal={signalToRepost}
            onClose={() => setSignalToRepost(null)}
            onSimpleRepost={handleSimpleRepost}
            onQuoteRepost={handleQuoteRepost}
            isPosting={isPosting}
        />
      )}

      {isEditProfileModalOpen && currentUserProfile && (
        <EditProfileModal 
          userProfile={currentUserProfile}
          onClose={() => setIsEditProfileModalOpen(false)}
        />
      )}

      {isRecoveryInfoModalOpen && currentUserProfile && (
          <RecoveryInfoModal
            userProfile={currentUserProfile}
            onClose={() => setIsRecoveryInfoModalOpen(false)}
          />
      )}

      {signalToDelete && (
        <ConfirmationModal 
            isOpen={!!signalToDelete}
            onClose={handleCancelDelete}
            onConfirm={handleConfirmDelete}
            title={t('delete_modal_title')}
            message={t('delete_modal_message')}
        />
      )}

      {/* Mobile-only Modals/Panels */}
      {isMobileSearchOpen && (
          <MobileSearch 
            onClose={() => setIsMobileSearchOpen(false)}
            onSelectProfile={(profile) => {
              handleViewProfile(profile);
              setIsMobileSearchOpen(false);
            }}
          />
      )}
       <MobilePanel
          isOpen={isCreateSignalOpen}
          onClose={() => setIsCreateSignalOpen(false)}
          title={t('create_signal_title_placeholder')}
       >
          <CreateSignalForm userProfile={currentUserProfile} onPost={handlePostSignal} isPosting={isPosting} />
       </MobilePanel>
       <MobilePanel
          isOpen={isMobileNotificationsOpen}
          onClose={() => setIsMobileNotificationsOpen(false)}
          title={t('notifications_title')}
          noPadding
       >
          <NotificationPanel 
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onClearAll={handleClearNotifications}
            onClose={() => setIsMobileNotificationsOpen(false)}
          />
       </MobilePanel>
        <MobilePanel
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          title={t('dashboard_title')}
       >
          <DashboardControls 
            filters={filters}
            onFilterChange={handleFilterChange}
            allTokenTags={allTokenTags}
          />
       </MobilePanel>
       <MobilePanel
          isOpen={isMobileSettingsOpen}
          onClose={() => setIsMobileSettingsOpen(false)}
          title={t('settings_title')}
       >
          <div className="space-y-2">
              <button 
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between text-left p-3 text-light-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 rounded-lg transition-colors"
              >
                  <span className="font-semibold">{t('settings_theme_toggle')}</span>
                  {theme === 'dark' ? <SunIcon className="w-6 h-6 text-krypton-accent" /> : <MoonIcon className="w-6 h-6 text-krypton-purple" />}
              </button>
              <button 
                  onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
                  className="w-full flex items-center justify-between text-left p-3 text-light-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 rounded-lg transition-colors"
              >
                  <span className="font-semibold">{t('settings_language_toggle')}</span>
                  <span className="text-sm font-bold text-krypton-blue-500">{language === 'pt' ? t('settings_language_pt') : t('settings_language_en')}</span>
              </button>
              <button
                  onClick={() => {
                    handleViewBlockchain();
                    setIsMobileSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-between text-left p-3 text-light-text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 rounded-lg transition-colors"
              >
                  <span className="font-semibold">Blockchain Explorer</span>
                  <GitCommitIcon className="w-6 h-6 text-krypton-gray-400" />
              </button>
              <button 
                  onClick={() => {
                      logout();
                      setIsMobileSettingsOpen(false);
                  }} 
                  className="w-full text-left p-3 font-semibold text-krypton-danger hover:bg-red-50 dark:hover:bg-krypton-danger/20 rounded-lg transition-colors"
              >
                  {t('header_sign_out')}
              </button>
          </div>
       </MobilePanel>
      

      <BottomNavBar 
        activeView={currentView === 'profile' ? 'profile' : currentView === 'blockchain' ? 'feed' : 'feed'}
        onNavigate={handleMobileNavigate}
        avatarUrl={currentUserProfile.avatarUrl}
        unreadCount={notifications.filter(n => !n.read).length}
      />
    </div>
  );
};

export default App;