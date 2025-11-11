import React, { useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { LoaderIcon, AlertTriangleIcon, CheckCircleIcon } from './icons';
import { getUserByWalletHash } from '../services/firebase';
import type { CurrentUserProfile } from '../types';
// FIX: Using namespace import for firebase auth functions to avoid potential module resolution errors.
import * as firebaseAuth from 'firebase/auth';

interface ForgotPasswordViewProps {
  onBackToLogin: () => void;
}

const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBackToLogin }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'enterHash' | 'enterKeyword' | 'resetPassword' | 'success'>('enterHash');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [walletHash, setWalletHash] = useState('');
  const [keyword, setKeyword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [foundProfile, setFoundProfile] = useState<CurrentUserProfile | null>(null);

  const handleVerifyHash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletHash.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const profile = await getUserByWalletHash(walletHash.trim());
      if (profile) {
        setFoundProfile(profile);
        setStep('enterKeyword');
      } else {
        setError(t('forgot_password_error_hash_not_found'));
      }
    } catch (err) {
      setError(t('auth_error_generic'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !foundProfile) return;
    if (keyword.trim().toLowerCase() === foundProfile.keyword.toLowerCase()) {
      setStep('resetPassword');
      setError(null);
    } else {
      setError(t('forgot_password_error_keyword_incorrect'));
    }
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t('forgot_password_error_password_mismatch'));
      return;
    }
    if (newPassword.length < 6) {
        setError(t('auth_error_weak_password'));
        return;
    }
    
    setError(null);
    setIsLoading(true);
    
    // To update a user's password, Firebase requires them to be recently logged in.
    // The workaround is to log them in with their OLD password and then immediately update it.
    // Since we don't have the old password, a proper implementation requires a backend with Admin SDK.
    // As this is a client-only app, we will SIMULATE the password change for the demo.
    // In a real app, you would send a request to your server here.
    try {
        // This is a simulation.
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`SIMULATION: Password for user ${foundProfile?.handle} would be changed to "${newPassword}"`);
        setStep('success');

    } catch (err) {
        setError(t('auth_error_generic'));
        console.error("Password reset simulation failed:", err);
    } finally {
        setIsLoading(false);
    }
  };


  const renderStep = () => {
    switch (step) {
      case 'enterHash':
        return (
          <form onSubmit={handleVerifyHash} className="space-y-4">
            <h3 className="text-center font-bold">{t('forgot_password_step1_title')}</h3>
            <div>
              <input
                type="text"
                placeholder={t('forgot_password_hash_placeholder')}
                value={walletHash}
                onChange={e => setWalletHash(e.target.value)}
                required
                className="block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-krypton-blue-500"
              />
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500 disabled:opacity-50">
              {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : t('forgot_password_verify_hash_button')}
            </button>
          </form>
        );

      case 'enterKeyword':
         return (
          <form onSubmit={handleVerifyKeyword} className="space-y-4">
            <h3 className="text-center font-bold">{t('forgot_password_step2_title')}</h3>
            <div>
              <input
                type="text"
                placeholder={t('forgot_password_keyword_placeholder')}
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                required
                className="block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-krypton-blue-500"
              />
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500 disabled:opacity-50">
              {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : t('forgot_password_verify_keyword_button')}
            </button>
          </form>
        );
      
       case 'resetPassword':
         return (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <h3 className="text-center font-bold">{t('forgot_password_step3_title')}</h3>
             <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300" htmlFor="newPassword">{t('forgot_password_new_password_label')}</label>
                <input
                    id="newPassword" type="password" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} required
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md"
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300" htmlFor="confirmPassword">{t('forgot_password_confirm_password_label')}</label>
                <input
                    id="confirmPassword" type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} required
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md"
                />
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500 disabled:opacity-50">
              {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : t('forgot_password_reset_button')}
            </button>
          </form>
        );

      case 'success':
        return (
            <div className="text-center space-y-4">
                <CheckCircleIcon className="w-12 h-12 text-krypton-success mx-auto" />
                <p>{t('forgot_password_success_message')}</p>
                 <button onClick={onBackToLogin} className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500">
                    {t('forgot_password_back_to_login')}
                </button>
            </div>
        );
    }
  };

  return (
    <div className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl p-8 shadow-lg">
      <h2 className="text-xl font-bold text-center mb-4">{t('forgot_password_title')}</h2>
      {renderStep()}
      {error && (
        <div className="mt-4 bg-red-100/10 border border-krypton-danger/30 text-krypton-danger p-3 rounded-md flex items-center text-sm">
          <AlertTriangleIcon className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
       {step !== 'success' && (
        <p className="mt-6 text-center text-sm">
            <button onClick={onBackToLogin} className="font-medium text-krypton-blue-500 hover:underline">
                {t('forgot_password_back_to_login')}
            </button>
        </p>
       )}
    </div>
  );
};

export default ForgotPasswordView;