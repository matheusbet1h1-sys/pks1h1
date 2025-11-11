import React, { useState, useEffect, useRef } from 'react';
import type { Signal, CurrentUserProfile, UserProfile, Comment } from '../types';
import { useLanguage } from './LanguageProvider';
import { XIcon, VerifiedIcon, LoaderIcon, Trash2Icon, MoreHorizontalIcon } from './icons';

interface SignalModalProps {
  signal: Signal;
  userProfile: CurrentUserProfile;
  onClose: () => void;
  onPostComment: (signalId: string, content: string, replyingTo?: { authorId: string; authorHandle: string }) => void;
  onViewProfile: (profile: UserProfile) => void;
  onDeleteSignal: (signal: Signal) => void;
  scrollToComments?: boolean;
}

const formatTimeAgo = (date: Date, lang: 'pt' | 'en'): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
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

const SignalModal: React.FC<SignalModalProps> = ({ signal, userProfile, onClose, onPostComment, onViewProfile, onDeleteSignal, scrollToComments }) => {
  const { t, language } = useLanguage();
  const [commentContent, setCommentContent] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment['author'] | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor = userProfile.id === signal.author.id;

  useEffect(() => {
    if (scrollToComments && commentsSectionRef.current) {
      setTimeout(() => {
        commentsSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 150);
    }
  }, [scrollToComments]);

   useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || isCommenting) return;
    setIsCommenting(true);
    const replyData = replyingTo ? { authorId: replyingTo.id, authorHandle: replyingTo.handle } : undefined;
    await onPostComment(signal.id, commentContent, replyData);
    setCommentContent('');
    setReplyingTo(null);
    setIsCommenting(false);
  };
  
  const handleProfileClick = (profile: UserProfile) => {
      onClose();
      onViewProfile(profile);
  }

  const handleStartReply = (author: UserProfile) => {
      setReplyingTo(author);
      commentInputRef.current?.focus();
  };

  const handleDelete = () => {
    onDeleteSignal(signal);
    onClose(); // Close details modal to show confirmation modal
    setIsMenuOpen(false);
  };


  return (
    <div
      className="fixed inset-0 bg-krypton-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-light-border dark:border-krypton-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold">{t('modal_signal_details_title')}</h2>
          <div className="flex items-center space-x-2">
            {isAuthor && (
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(prev => !prev)}
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
            <button onClick={onClose} className="text-light-text-secondary dark:text-krypton-gray-400 hover:text-light-text-primary dark:hover:text-white transition-colors">
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
             <div className="bg-light-card dark:bg-krypton-gray-800 flex flex-col">
              <button onClick={() => handleProfileClick(signal.author)} className="flex items-center mb-4 text-left hover:opacity-80 transition-opacity">
                <img src={signal.author.avatarUrl} alt={signal.author.name} className="w-11 h-11 rounded-full mr-3" />
                <div className="flex-grow">
                  <div className="flex items-center text-base">
                    <span className="font-bold mr-1">{signal.author.name}</span>
                    {signal.author.isVerified && <VerifiedIcon className="w-4 h-4 text-krypton-blue-500" />}
                  </div>
                  <p className="text-sm text-light-text-secondary dark:text-krypton-gray-400">{signal.author.handle} &middot; {formatTimeAgo(signal.timestamp, language)}</p>
                </div>
              </button>
        
              <div className="mb-4">
                {signal.title && <h3 className="text-xl font-semibold mb-2 leading-tight">{signal.title}</h3>}
                {signal.content && <p className="text-light-text-secondary dark:text-krypton-gray-300 text-base mb-4 break-words whitespace-pre-wrap">{signal.content}</p>}

                 {signal.quotedSignal && signal.quotedSignal.author && (
                    <div className="mt-4 border border-light-border dark:border-krypton-gray-600 rounded-xl p-3">
                      <div className="flex items-center text-sm mb-2">
                        <img src={signal.quotedSignal.author.avatarUrl} alt={signal.quotedSignal.author.name} className="w-5 h-5 rounded-full mr-2" />
                        <span className="font-bold mr-1">{signal.quotedSignal.author.name}</span>
                        <span className="text-light-text-secondary dark:text-krypton-gray-400 truncate">{signal.quotedSignal.author.handle} &middot; {formatTimeAgo(signal.quotedSignal.timestamp, language)}</span>
                      </div>
                      <p className="text-sm text-light-text-secondary dark:text-krypton-gray-300 break-words">
                        {signal.quotedSignal.title && <strong className="text-light-text-primary dark:text-white block mb-1">{signal.quotedSignal.title}</strong>}
                        {signal.quotedSignal.content}
                      </p>
                    </div>
                  )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {signal.tokenTags.map(tag => (
                    <span key={tag} className="bg-gray-200 dark:bg-krypton-gray-700 text-light-text-secondary dark:text-krypton-gray-300 text-xs font-semibold px-2.5 py-1 rounded-full">${tag}</span>
                  ))}
                </div>
              </div>
            </div>
            <div ref={commentsSectionRef} className="mt-6 pt-6 border-t border-light-border dark:border-krypton-gray-700">
                <h3 className="text-base font-bold mb-4">{t('modal_comments_title')} ({Math.max(0, signal.stats.comments)})</h3>
                <div className="space-y-4">
                    {signal.comments.map(comment => (
                        <div key={comment.id} className="flex items-start space-x-3 animate-fade-in">
                            <button onClick={() => handleProfileClick(comment.author)} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                                <img src={comment.author.avatarUrl} alt={comment.author.name} className="w-9 h-9 rounded-full" />
                            </button>
                            <div className="flex-1 bg-gray-100 dark:bg-krypton-gray-700/50 rounded-lg p-3">
                                <div className="flex items-center text-sm">
                                    <button onClick={() => handleProfileClick(comment.author)} className="flex items-center text-left hover:underline">
                                        <span className="font-bold mr-1.5">{comment.author.name}</span>
                                        {comment.author.isVerified && <VerifiedIcon className="w-3 h-3 text-krypton-blue-500" />}
                                        <span className="text-light-text-secondary dark:text-krypton-gray-500 ml-1.5 hidden sm:inline">{comment.author.handle}</span>
                                    </button>
                                    <span className="text-light-text-secondary dark:text-krypton-gray-400 ml-auto">{formatTimeAgo(comment.timestamp, language)}</span>
                                </div>
                                <p className="text-light-text-secondary dark:text-krypton-gray-300 text-sm mt-1 break-words">
                                    {comment.replyingTo && (
                                        <button onClick={() => handleProfileClick({id: comment.replyingTo.authorId} as UserProfile)} className="text-krypton-blue-500 font-semibold mr-1 hover:underline">
                                            {comment.replyingTo.authorHandle}
                                        </button>
                                    )}
                                    {comment.content}
                                </p>
                                <div className="mt-2">
                                    <button onClick={() => handleStartReply(comment.author)} className="text-xs font-bold text-krypton-blue-500 hover:underline">
                                        {t('modal_reply_button')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="p-4 border-t border-light-border dark:border-krypton-gray-700 flex-shrink-0">
          <form onSubmit={handlePostComment} className="flex items-start space-x-3">
            <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              {replyingTo && (
                <div className="text-xs text-light-text-secondary dark:text-krypton-gray-400 mb-1 flex items-center">
                  <span>{t('modal_replying_to')} <span className="font-semibold text-krypton-blue-500">{replyingTo.handle}</span></span>
                  <button onClick={() => setReplyingTo(null)} className="ml-2 text-krypton-danger font-bold hover:underline">[{t('modal_cancel_reply')}]</button>
                </div>
              )}
              <textarea
                ref={commentInputRef}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={t('modal_reply_placeholder')}
                className="w-full bg-gray-100 dark:bg-krypton-gray-700/60 rounded-lg px-4 py-2 text-sm placeholder-gray-400 dark:placeholder-krypton-gray-500 focus:outline-none focus:ring-1 focus:ring-krypton-blue-500 resize-none transition-all"
                rows={2}
                aria-label={t('modal_reply_placeholder')}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!commentContent.trim() || isCommenting}
                  className="bg-krypton-blue-600 text-white font-bold px-5 py-1.5 rounded-full text-sm hover:bg-krypton-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-28"
                >
                  {isCommenting ? (
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                  ) : (
                      <span>{t('modal_reply_button')}</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignalModal;