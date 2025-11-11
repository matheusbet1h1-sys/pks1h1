import React, { useState, useRef, useEffect } from 'react';
import type { Signal, IntegrityAnalysis, UserProfile, CurrentUserProfile } from '../types';
import { 
  VerifiedIcon, FileTextIcon, ActivityIcon, 
  AtSignIcon, MessageCircleIcon, GitCommitIcon, HeartIcon, RepeatIcon, 
  ShieldCheckIcon, ChevronDownIcon, LinkIcon, LoaderIcon, CpuIcon, MoreHorizontalIcon, Trash2Icon,
  GlobeIcon
} from './icons';
import { useLanguage } from './LanguageProvider';

interface SignalCardProps {
  signal: Signal;
  currentUserProfile: CurrentUserProfile;
  onInteract: (signalId: string, type: 'like' | 'repost' | 'comment') => void;
  isLiked: boolean;
  isLiking: boolean;
  onSelectSignal: (signal: Signal) => void;
  onViewProfile: (profile: UserProfile) => void;
  onRequestAnalysis: (signalId: string) => void;
  onDeleteSignal: (signal: Signal) => void;
  onTranslateSignal: (signalId: string) => void;
  isTranslating: boolean;
}

const typeStyles = {
  NEWS: { icon: <FileTextIcon className="w-4 h-4" /> },
  ON_CHAIN: { icon: <ActivityIcon className="w-4 h-4" /> },
  SOCIAL_SENTIMENT: { icon: <AtSignIcon className="w-4 h-4" /> },
  RUMOR: { icon: <MessageCircleIcon className="w-4 h-4" /> },
  PROJECT_UPDATE: { icon: <GitCommitIcon className="w-4 h-4" /> }
};

const formatStat = (num: number) => {
  if (num > 999) return `${(num / 1000).toFixed(1)}k`;
  return num;
};

const formatTimeAgo = (date: Date, lang: 'pt' | 'en'): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return lang === 'pt' ? 'agora' : 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    return `${days}d`;
}


const getScoreColor = (score: number) => {
  if (score > 75) return 'text-krypton-success';
  if (score > 40) return 'text-krypton-accent';
  return 'text-krypton-danger';
}

const AnalysisPending: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="bg-gray-50 dark:bg-krypton-gray-900/50 border border-light-border dark:border-krypton-gray-700 rounded-lg mt-4 p-3 flex items-center space-x-3">
            <LoaderIcon className="w-5 h-5 animate-spin text-krypton-blue-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-light-text-secondary dark:text-krypton-gray-400">{t('signal_card_analyzing')}</p>
        </div>
    );
};

const IntegrityReport: React.FC<{ analysis: IntegrityAnalysis }> = ({ analysis }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useLanguage();
    const scoreColor = getScoreColor(analysis.trustScore);
    
    const renderAnalysisText = (text: any): string => {
        if (typeof text === 'string') return text;
        if (typeof text === 'object' && text !== null) {
            if (text.conclusion && typeof text.conclusion === 'string') return text.conclusion;
            if (text.finding && typeof text.finding === 'string') return text.finding;
            if (text.summary && typeof text.summary === 'string') return text.summary;
            return `[${t('signal_card_complex_analysis')}]`;
        }
        return '';
    };

    const BreakdownRow: React.FC<{label: string, score: number, finding: string | object}> = ({label, score, finding}) => (
        <div className="flex justify-between items-center text-xs">
            <span className="text-light-text-secondary dark:text-krypton-gray-400">{label}</span>
            <div className="flex items-center">
                <span className="italic text-light-text-secondary dark:text-krypton-gray-400 mr-2">"{renderAnalysisText(finding)}"</span>
                <span className={`font-bold ${getScoreColor(score)}`}>{score}/100</span>
            </div>
        </div>
    );

    const hasBreakdown = analysis.breakdown && analysis.breakdown.manipulationRisk && analysis.breakdown.scamPotential && analysis.breakdown.factuality;
    
    return (
        <div className="bg-gray-50 dark:bg-krypton-gray-900/50 border border-light-border dark:border-krypton-gray-700 rounded-lg mt-4 overflow-hidden">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex items-center justify-between w-full p-3 text-left"
            >
              <div className="flex items-center">
                <ShieldCheckIcon className={`w-5 h-5 mr-2 ${scoreColor}`} />
                <p className={`font-bold text-sm ${scoreColor}`}>{t('signal_card_trust_score')}: {analysis.trustScore}/100</p>
              </div>
              <ChevronDownIcon className={`w-5 h-5 text-light-text-secondary dark:text-krypton-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-4 pb-3 pt-3 space-y-3 border-t border-light-border dark:border-krypton-gray-700">
                <p className="text-xs text-light-text-secondary dark:text-krypton-gray-400">{renderAnalysisText(analysis.summary)}</p>
                
                {hasBreakdown && (
                  <div className="space-y-2">
                      <h4 className="text-xs font-bold text-light-text-secondary dark:text-krypton-gray-300">{t('signal_card_integrity_breakdown')}</h4>
                      <BreakdownRow label={t('signal_card_manipulation_risk')} {...analysis.breakdown.manipulationRisk} />
                      <BreakdownRow label={t('signal_card_scam_potential')} {...analysis.breakdown.scamPotential} />
                      <BreakdownRow label={t('signal_card_factuality')} {...analysis.breakdown.factuality} />
                  </div>
                )}
                
                {analysis.sources && analysis.sources.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-light-text-secondary dark:text-krypton-gray-300">{t('signal_card_verified_sources')}</h4>
                        <ul className="space-y-1">
                            {analysis.sources.slice(0, 3).map((source) => (
                                <li key={source.uri}>
                                    <a 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center text-xs text-krypton-blue-500 hover:underline"
                                    >
                                        <LinkIcon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                        <span className="truncate">{source.title}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
            </div>
        </div>
    );
};


const ActionButton: React.FC<{
  icon: React.ReactNode;
  count: number;
  onClick: () => void;
  isActive?: boolean;
  activeColor?: string;
  hoverColor: string;
  isLoading?: boolean;
}> = ({ icon, count, onClick, isActive, activeColor, hoverColor, isLoading }) => {
  const activeClasses = isActive ? `${activeColor}` : 'text-light-text-secondary dark:text-krypton-gray-500';
  
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      disabled={isLoading}
      className={`flex items-center space-x-2 ${activeClasses} ${hoverColor} transition-colors duration-200 group disabled:opacity-50 disabled:cursor-wait`}
    >
      <div className={`flex items-center justify-center w-5 h-5 ${isActive ? 'fill-current' : ''}`}>
        {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : icon}
      </div>
      <span className="text-sm font-medium">{formatStat(count)}</span>
    </button>
  );
};

const SignalCard: React.FC<SignalCardProps> = ({ signal, currentUserProfile, onInteract, isLiked, isLiking, onSelectSignal, onViewProfile, onRequestAnalysis, onDeleteSignal, onTranslateSignal, isTranslating }) => {
  const { t, language, translateSignalType } = useLanguage();
  const typeStyle = typeStyles[signal.type];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor = currentUserProfile.id === signal.author.id;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = () => {
      onDeleteSignal(signal);
      setIsMenuOpen(false);
  };
  
  const renderTranslateButton = () => {
    // Show button if lang is PT, it's a bot post, and it's not already translated
    if (language !== 'pt' || !signal.author.isBot || signal.isTranslated) {
      return null;
    }
    
    return (
      <div className="mt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTranslateSignal(signal.id);
          }}
          disabled={isTranslating}
          className="w-full bg-krypton-purple/10 dark:bg-krypton-purple/20 text-krypton-purple dark:text-purple-400 text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center hover:bg-krypton-purple/20 dark:hover:bg-krypton-purple/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {isTranslating ? (
            <>
              <LoaderIcon className="w-5 h-5 mr-2 animate-spin" />
              <span>{t('translating')}</span>
            </>
          ) : (
            <>
              <GlobeIcon className="w-5 h-5 mr-2" />
              <span>{t('signal_card_translate_button')}</span>
            </>
          )}
        </button>
      </div>
    );
  };

  const renderAnalysisSection = () => {
    if (signal.quotedSignal) return null; // No analysis on quote reposts

    if (signal.integrityAnalysis) {
      return <IntegrityReport analysis={signal.integrityAnalysis} />;
    }
    if (signal.integrityAnalysis === null) {
      return <AnalysisPending />;
    }
    if (signal.author.isBot) {
        return null;
    }
    return (
      <div className="mt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestAnalysis(signal.id);
          }}
          className="w-full bg-krypton-blue-500/10 dark:bg-krypton-blue-500/20 text-krypton-blue-600 dark:text-krypton-blue-400 text-sm font-bold py-2 px-4 rounded-lg flex items-center justify-center hover:bg-krypton-blue-500/20 dark:hover:bg-krypton-blue-500/30 transition-colors"
        >
          <CpuIcon className="w-5 h-5 mr-2" />
          {t('signal_card_request_analysis')}
        </button>
      </div>
    );
  };
  
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Prevent opening modal if clicking on a link inside the quoted signal
    if (target.closest('a') || target.closest('.quoted-signal-container')) {
      e.stopPropagation();
      return;
    }
    onSelectSignal(signal);
  };

  return (
    <article className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl flex flex-col transition-all duration-300 hover:border-gray-300 dark:hover:border-krypton-gray-600 animate-fade-in">
      <div className="p-5 flex-grow">
        <header className="flex items-start mb-4">
          <button onClick={(e) => { e.stopPropagation(); onViewProfile(signal.author); }} className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <img src={signal.author.avatarUrl} alt={signal.author.name} className="w-11 h-11 rounded-full mr-3" />
          </button>
          <div className="flex-grow">
            <button onClick={(e) => { e.stopPropagation(); onViewProfile(signal.author); }} className="flex items-center text-base text-left hover:underline">
              <span className="font-bold mr-1">{signal.author.name}</span>
              {signal.author.isVerified && <VerifiedIcon className="w-4 h-4 text-krypton-blue-500" />}
            </button>
            <p className="text-sm text-light-text-secondary dark:text-krypton-gray-400">{signal.author.handle} &middot; {formatTimeAgo(signal.timestamp, language)}</p>
          </div>
          <div className="flex items-center text-sm text-light-text-secondary dark:text-krypton-gray-400 bg-gray-100 dark:bg-krypton-gray-700/60 px-2 py-1 rounded-md">
            {React.cloneElement(typeStyle.icon, { className: 'w-4 h-4 mr-1.5' })}
            <span>{translateSignalType(signal.type)}</span>
          </div>
           {isAuthor && (
              <div className="relative ml-2" ref={menuRef}>
                  <button 
                      onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
                      className="p-1 rounded-full text-light-text-secondary dark:text-krypton-gray-400 hover:bg-gray-200 dark:hover:bg-krypton-gray-700"
                  >
                      <MoreHorizontalIcon className="w-5 h-5" />
                  </button>
                  {isMenuOpen && (
                      <div className="absolute top-8 right-0 w-36 bg-light-card dark:bg-krypton-gray-600 border border-light-border dark:border-krypton-gray-500 rounded-lg shadow-2xl animate-fade-in z-10">
                          <button
                              onClick={handleDelete}
                              className="w-full flex items-center px-3 py-2 text-sm text-krypton-danger hover:bg-red-50 dark:hover:bg-krypton-danger/20"
                          >
                              <Trash2Icon className="w-4 h-4 mr-2" />
                              {t('signal_card_delete_button')}
                          </button>
                      </div>
                  )}
              </div>
           )}
        </header>

        <div className="mb-4 cursor-pointer" onClick={handleContentClick}>
          {signal.title && <h3 className="text-lg font-semibold mb-2 leading-tight">{signal.title}</h3>}
          {signal.content && <p className="text-light-text-secondary dark:text-krypton-gray-300 text-base mb-4 break-words whitespace-pre-wrap">{signal.content}</p>}
          
          {signal.quotedSignal && (
            <div className="mt-4 border border-light-border dark:border-krypton-gray-600 rounded-xl p-3 quoted-signal-container hover:bg-gray-50 dark:hover:bg-krypton-gray-700/50"
                 onClick={(e) => { e.stopPropagation(); onSelectSignal(signal.quotedSignal!)}}>
              <div className="flex items-center text-sm mb-2">
                <img src={signal.quotedSignal.author.avatarUrl} alt={signal.quotedSignal.author.name} className="w-5 h-5 rounded-full mr-2" />
                <span className="font-bold mr-1">{signal.quotedSignal.author.name}</span>
                <span className="text-light-text-secondary dark:text-krypton-gray-400 truncate">{signal.quotedSignal.author.handle} &middot; {formatTimeAgo(signal.quotedSignal.timestamp, language)}</span>
              </div>
              <p className="text-sm text-light-text-secondary dark:text-krypton-gray-300 break-words line-clamp-3">
                {signal.quotedSignal.title && <span className="font-semibold text-light-text-primary dark:text-white">{signal.quotedSignal.title}</span>}
                <br/>
                {signal.quotedSignal.content}
              </p>
            </div>
          )}
          
          {renderTranslateButton()}
          {renderAnalysisSection()}
          
          <div className="flex flex-wrap gap-2 mt-4">
            {signal.tokenTags.map(tag => (
              <span key={tag} className="bg-gray-200 dark:bg-krypton-gray-700 text-light-text-secondary dark:text-krypton-gray-300 text-xs font-semibold px-2.5 py-1 rounded-full">${tag}</span>
            ))}
          </div>
        </div>
      </div>

      <footer className="px-5 pb-5 border-t border-light-border dark:border-krypton-gray-700/80 pt-3">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <ActionButton
                  icon={<MessageCircleIcon className="w-5 h-5" />}
                  count={Math.max(0, signal.stats.comments)}
                  onClick={() => onInteract(signal.id, 'comment')}
                  hoverColor="hover:text-krypton-blue-500"
                />
                <ActionButton
                  icon={<RepeatIcon className="w-5 h-5" />}
                  count={Math.max(0, signal.stats.reposts)}
                  onClick={() => onInteract(signal.id, 'repost')}
                  hoverColor="hover:text-krypton-success"
                />
                <ActionButton
                  icon={<HeartIcon className="w-5 h-5" />}
                  count={Math.max(0, signal.stats.likes)}
                  onClick={() => onInteract(signal.id, 'like')}
                  isActive={isLiked}
                  activeColor="text-krypton-danger"
                  hoverColor="hover:text-krypton-danger"
                  isLoading={isLiking}
                />
              </div>
          </div>
      </footer>
    </article>
  );
};

export default SignalCard;