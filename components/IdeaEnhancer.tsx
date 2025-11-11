import React from 'react';
import type { EnhancedSignalSuggestion } from '../types';
import { useLanguage } from './LanguageProvider';
import { XIcon, SparklesIcon, LoaderIcon } from './icons';

interface IdeaEnhancerProps {
  suggestions: EnhancedSignalSuggestion[] | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (suggestion: EnhancedSignalSuggestion) => void;
  onClose: () => void;
  onRetry: () => void;
}

const IdeaEnhancer: React.FC<IdeaEnhancerProps> = ({ suggestions, isLoading, error, onSelect, onClose, onRetry }) => {
  const { t } = useLanguage();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <LoaderIcon className="w-12 h-12 animate-spin text-krypton-blue-500" />
          <p className="mt-4 text-lg text-light-text-secondary dark:text-krypton-gray-400">{t('enhancer_button_enhancing')}</p>
        </div>
      );
    }

    if (error) {
       return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-krypton-danger mb-4">{t('enhancer_error')}</p>
          <button
            onClick={onRetry}
            className="bg-krypton-blue-600 text-white font-bold px-5 py-2 rounded-full hover:bg-krypton-blue-500 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {suggestions?.map((suggestion, index) => (
          <div key={index} className="bg-gray-100 dark:bg-krypton-gray-700/50 p-4 rounded-lg animate-fade-in">
            <h4 className="font-bold text-base mb-1">{suggestion.title}</h4>
            <p className="text-sm text-light-text-secondary dark:text-krypton-gray-300 mb-3 whitespace-pre-wrap">{suggestion.content}</p>
            <div className="text-right">
              <button
                onClick={() => onSelect(suggestion)}
                className="bg-krypton-blue-600 text-white font-bold px-4 py-1.5 rounded-full text-sm hover:bg-krypton-blue-500 transition-colors"
              >
                {t('enhancer_use_suggestion')}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
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
        <header className="p-4 border-b border-light-border dark:border-krypton-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 mr-3 text-krypton-accent" />
            <div>
                <h2 className="text-lg font-bold">{t('enhancer_title')}</h2>
                <p className="text-sm text-light-text-secondary dark:text-krypton-gray-400">{t('enhancer_description')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-light-text-secondary dark:text-krypton-gray-400 hover:text-light-text-primary dark:hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default IdeaEnhancer;
