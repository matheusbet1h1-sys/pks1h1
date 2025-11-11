
import React, { useState } from 'react';
import type { CurrentUserProfile, Signal, EnhancedSignalSuggestion } from '../types';
import { LoaderIcon, SparklesIcon, UserCircleIcon } from './icons';
import { useLanguage } from './LanguageProvider';
import { enhanceSignalIdea } from '../services/geminiService';
import IdeaEnhancer from './IdeaEnhancer';

interface CreateSignalFormProps {
    userProfile: CurrentUserProfile;
    onPost: (newSignal: Omit<Signal, 'id' | 'author' | 'timestamp' | 'stats' | 'integrityAnalysis' | 'comments'>) => void;
    isPosting: boolean;
}

const CreateSignalForm: React.FC<CreateSignalFormProps> = ({ userProfile, onPost, isPosting }) => {
    const { t, language } = useLanguage();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    
    // AI Enhancer State
    const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhancerSuggestions, setEnhancerSuggestions] = useState<EnhancedSignalSuggestion[] | null>(null);
    const [enhancerError, setEnhancerError] = useState<string | null>(null);

    const canPost = title.trim() !== '' && content.trim() !== '';

    const handleEnhanceClick = async () => {
        if (!content.trim() || isEnhancing) return;

        setIsEnhancerOpen(true);
        setIsEnhancing(true);
        setEnhancerError(null);
        setEnhancerSuggestions(null);

        try {
            const suggestions = await enhanceSignalIdea(content, language);
            setEnhancerSuggestions(suggestions);
        } catch (e) {
            console.error("Error enhancing idea:", e);
            setEnhancerError(t('enhancer_error'));
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleSelectSuggestion = (suggestion: EnhancedSignalSuggestion) => {
        setTitle(suggestion.title);
        setContent(suggestion.content);
        setIsEnhancerOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canPost || isPosting) return;

        onPost({
            title,
            content,
            tokenTags: tags.split(',').map(t => t.trim().toUpperCase()).filter(t => t),
            // Defaulting some values for simplicity
            type: 'SOCIAL_SENTIMENT', // or determine based on content
            dataType: 'User Post',
            signalStrength: 50, // or calculate based on analysis
        });

        // Reset form
        setTitle('');
        setContent('');
        setTags('');
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl p-5">
                <div className="flex items-start">
                    {userProfile.avatarUrl ? (
                        <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-11 h-11 rounded-full mr-4" />
                    ) : (
                        <UserCircleIcon className="w-11 h-11 rounded-full mr-4 text-krypton-gray-500" />
                    )}
                    <div className="w-full">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('create_signal_title_placeholder')}
                            className="w-full bg-transparent text-lg font-semibold placeholder-gray-400 dark:placeholder-krypton-gray-400 focus:outline-none mb-2"
                        />
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t('create_signal_content_placeholder', { name: userProfile.name.split(' ')[0] })}
                            className="w-full bg-transparent placeholder-gray-500 dark:placeholder-krypton-gray-400 focus:outline-none resize-none h-24"
                        />
                         <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder={t('create_signal_tags_placeholder')}
                            className="w-full bg-gray-100 dark:bg-krypton-gray-700/50 rounded-md px-3 py-1.5 text-sm placeholder-gray-400 dark:placeholder-krypton-gray-400 focus:outline-none focus:ring-1 focus:ring-krypton-blue-500 mt-2"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-light-border dark:border-krypton-gray-700/80">
                    <button
                        type="button"
                        onClick={handleEnhanceClick}
                        disabled={!content.trim() || isEnhancing || isPosting}
                        className="bg-transparent text-krypton-accent font-bold px-4 py-2 rounded-full border-2 border-krypton-accent/50 hover:bg-krypton-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                         {isEnhancing ? (
                            <>
                                <LoaderIcon className="w-5 h-5 animate-spin mr-2" />
                                <span>{t('enhancer_button_enhancing')}</span>
                            </>
                         ) : (
                            <>
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                <span>{t('enhancer_button')}</span>
                            </>
                         )}
                    </button>
                    <button
                        type="submit"
                        disabled={!canPost || isPosting}
                        className="bg-krypton-blue-600 text-white font-bold px-6 py-2 rounded-full hover:bg-krypton-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-36"
                    >
                        {isPosting ? (
                            <>
                                <LoaderIcon className="w-5 h-5 animate-spin mr-2" />
                                <span>{t('create_signal_analyzing_button')}</span>
                            </>
                        ) : (
                            <span>{t('create_signal_post_button')}</span>
                        )}
                    </button>
                </div>
            </form>
            {isEnhancerOpen && (
                <IdeaEnhancer 
                    isLoading={isEnhancing}
                    suggestions={enhancerSuggestions}
                    error={enhancerError}
                    onSelect={handleSelectSuggestion}
                    onClose={() => setIsEnhancerOpen(false)}
                    onRetry={handleEnhanceClick}
                />
            )}
        </>
    );
};

export default CreateSignalForm;
