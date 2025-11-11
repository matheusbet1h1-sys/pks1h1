import React from 'react';
import { useLanguage } from './LanguageProvider';
import { XIcon, AlertTriangleIcon } from './icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = true,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const confirmButtonClasses = isDestructive
    ? 'bg-krypton-danger hover:bg-red-700'
    : 'bg-krypton-blue-600 hover:bg-krypton-blue-500';

  return (
    <div
      className="fixed inset-0 bg-krypton-gray-900/80 backdrop-blur-sm z-[110] flex items-center justify-center animate-fade-in p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl w-full max-w-sm flex flex-col animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-light-text-secondary dark:text-krypton-gray-400 hover:text-light-text-primary dark:hover:text-white">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-4">
          <div className="flex items-start">
            {isDestructive && <AlertTriangleIcon className="w-10 h-10 mr-3 text-krypton-danger flex-shrink-0" />}
            <p className="text-light-text-secondary dark:text-krypton-gray-300">{message}</p>
          </div>
        </main>
        <footer className="p-4 flex justify-end items-center space-x-3 bg-gray-50 dark:bg-krypton-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full font-semibold text-sm bg-gray-200 dark:bg-krypton-gray-700 hover:bg-gray-300 dark:hover:bg-krypton-gray-600"
          >
            {cancelText || t('delete_modal_cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-full font-semibold text-sm text-white ${confirmButtonClasses}`}
          >
            {confirmText || t('delete_modal_confirm')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmationModal;
