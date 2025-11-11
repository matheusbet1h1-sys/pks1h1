import React, { useState } from 'react';
import type { CurrentUserProfile } from '../types';
import { useLanguage } from './LanguageProvider';
import { XIcon, AlertTriangleIcon, CopyIcon, CheckIcon } from './icons';

interface RecoveryInfoModalProps {
  userProfile: CurrentUserProfile;
  onClose: () => void;
}

const InfoRow: React.FC<{label: string, value: string}> = ({label, value}) => (
    <div>
        <label className="text-sm font-bold text-light-text-secondary dark:text-krypton-gray-400">{label}</label>
        <p className="mt-1 font-mono text-base bg-gray-100 dark:bg-krypton-gray-900/50 p-2 rounded-md break-all">{value}</p>
    </div>
);


const RecoveryInfoModal: React.FC<RecoveryInfoModalProps> = ({ userProfile, onClose }) => {
  const { t } = useLanguage();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `APOLO Recovery Info\n--------------------\nWallet Hash: ${userProfile.walletHash}\nKeyword: ${userProfile.keyword}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => {
        setIsCopied(false);
    }, 2500);
  };

  return (
    <div
      className="fixed inset-0 bg-krypton-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-light-border dark:border-krypton-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold">{t('recovery_modal_title')}</h2>
          <button onClick={onClose} className="text-light-text-secondary dark:text-krypton-gray-400 hover:text-light-text-primary dark:hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start bg-krypton-accent/10 border border-krypton-accent/20 p-3 rounded-lg text-krypton-accent/90">
                <AlertTriangleIcon className="w-8 h-8 mr-3 flex-shrink-0" />
                <p className="text-sm font-semibold">{t('recovery_modal_subtitle')}</p>
            </div>
            <div className="mt-4 space-y-4">
                <InfoRow label={t('recovery_modal_hash_label')} value={userProfile.walletHash} />
                <InfoRow label={t('recovery_modal_keyword_label')} value={userProfile.keyword} />
            </div>
        </main>
        
        <footer className="p-4 border-t border-light-border dark:border-krypton-gray-700 flex-shrink-0 space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
            <button
              onClick={handleCopy}
              disabled={isCopied}
              className="w-full sm:w-auto bg-gray-200 dark:bg-krypton-gray-700 font-bold px-5 py-2 rounded-full text-sm hover:bg-gray-300 dark:hover:bg-krypton-gray-600 transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {isCopied ? (
                  <>
                    <CheckIcon className="w-5 h-5 mr-2 text-krypton-success" />
                    <span>{t('recovery_modal_copied_button')}</span>
                  </>
              ) : (
                  <>
                    <CopyIcon className="w-5 h-5 mr-2" />
                    <span>{t('recovery_modal_copy_button')}</span>
                  </>
              )}
            </button>
             <button
              onClick={onClose}
              className="w-full sm:w-auto bg-krypton-blue-600 text-white font-bold px-5 py-2 rounded-full text-sm hover:bg-krypton-blue-500 transition-colors"
            >
              {t('recovery_modal_close_button')}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default RecoveryInfoModal;