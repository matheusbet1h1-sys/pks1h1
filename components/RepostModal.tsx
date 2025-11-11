import React, { useState } from 'react';
import type { Signal } from '../types';
import { useLanguage } from './LanguageProvider';
import { XIcon, RepeatIcon, MessageCircleIcon, VerifiedIcon, LoaderIcon } from './icons';

interface RepostModalProps {
  signal: Signal;
  onClose: () => void;
  onSimpleRepost: (signal: Signal) => void;
  onQuoteRepost: (signal: Signal, content: string) => void;
  isPosting: boolean;
}

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


const RepostModal: React.FC<RepostModalProps> = ({ signal, onClose, onSimpleRepost, onQuoteRepost, isPosting }) => {
  const { t, language } = useLanguage();
  const [view, setView] = useState<'choice' | 'quote'>('choice');
  const [quoteContent, setQuoteContent] = useState('');

  const handleQuoteSubmit = () => {
    if (!quoteContent.trim() || isPosting) return;
    onQuoteRepost(signal, quoteContent);
  };
  
  const renderChoiceView = () => (
    <>
        <button
            onClick={() => onSimpleRepost(signal)}
            className="w-full flex items-start space-x-4 p-4 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 transition-colors"
        >
            <RepeatIcon className="w-6 h-6 text-krypton-success flex-shrink-0 mt-1" />
            <div>
                <h3 className="font-bold">{t('repost_modal_repost_button')}</h3>
            </div>
        </button>
         <button
            onClick={() => setView('quote')}
            className="w-full flex items-start space-x-4 p-4 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 transition-colors"
        >
            <MessageCircleIcon className="w-6 h-6 text-krypton-blue-500 flex-shrink-0 mt-1" />
            <div>
                <h3 className="font-bold">{t('repost_modal_quote_repost_button')}</h3>
            </div>
        </button>
    </>
  );

  const renderQuoteView = () => (
    <div className="p-4">
        <textarea
            value={quoteContent}
            onChange={(e) => setQuoteContent(e.target.value)}
            placeholder={t('repost_modal_quote_placeholder')}
            className="w-full bg-transparent placeholder-gray-500 dark:placeholder-krypton-gray-400 focus:outline-none resize-none h-24 text-lg"
            autoFocus
        />
        <div className="mt-2 border border-light-border dark:border-krypton-gray-600 rounded-xl p-3">
            <div className="flex items-center text-sm mb-2">
                <img src={signal.author.avatarUrl} alt={signal.author.name} className="w-5 h-5 rounded-full mr-2" />
                <span className="font-bold mr-1">{signal.author.name}</span>
                 {signal.author.isVerified && <VerifiedIcon className="w-4 h-4 text-krypton-blue-500 mr-1" />}
                <span className="text-light-text-secondary dark:text-krypton-gray-400 truncate">{signal.author.handle} &middot; {formatTimeAgo(signal.timestamp, language)}</span>
            </div>
            <p className="text-sm text-light-text-secondary dark:text-krypton-gray-300 break-words line-clamp-3">
                {signal.content}
            </p>
        </div>
        <div className="flex justify-end mt-4">
            <button
                onClick={handleQuoteSubmit}
                disabled={!quoteContent.trim() || isPosting}
                className="bg-krypton-blue-600 text-white font-bold px-5 py-2 rounded-full text-sm hover:bg-krypton-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-28"
            >
                {isPosting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : t('repost_modal_post_button')}
            </button>
        </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-krypton-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl w-full max-w-lg flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-light-border dark:border-krypton-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold">{t('repost_modal_title')}</h2>
          <button onClick={onClose} className="text-light-text-secondary dark:text-krypton-gray-400 hover:text-light-text-primary dark:hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <main>
          {view === 'choice' ? renderChoiceView() : renderQuoteView()}
        </main>
      </div>
    </div>
  );
};

export default RepostModal;
