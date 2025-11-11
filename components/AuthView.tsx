import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { LoaderIcon, AlertTriangleIcon } from './icons';
import { useTheme } from './ThemeProvider';
import ForgotPasswordView from './ForgotPasswordView';

export interface AuthCredentials {
    email: string;
    password: string;
}

const AuthView: React.FC = () => {
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgotPassword'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [handle, setHandle] = useState('');
    const [keyword, setKeyword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const { login, signup } = useAuth();
    const { t } = useLanguage();
    const { theme } = useTheme();

    const handleAuthError = (err: any) => {
        const errorCode = typeof err === 'string' ? err : (err.message || err.code);
        switch (errorCode) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                setError(t('auth_error_invalid_credentials'));
                break;
            case 'auth/handle-already-in-use':
            case 'auth/email-already-in-use':
                setError(t('auth_error_handle_in_use'));
                break;
            case 'auth/weak-password':
                 setError(t('auth_error_weak_password'));
                 break;
            default:
                setError(t('auth_error_generic'));
                console.error(err);
                break;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (authMode === 'signup' && password.length < 6) {
            setError(t('auth_error_weak_password'));
            return;
        }

        if (authMode === 'signup' && password !== confirmPassword) {
            setError(t('auth_error_password_mismatch'));
            return;
        }

        setIsLoading(true);
        try {
            if (authMode === 'login') {
                await login({ handle, password });
            } else {
                await signup({ name, handle, password, keyword });
            }
        } catch (err) {
            handleAuthError(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const logoUrl = theme === 'dark' 
      ? 'https://i.ibb.co/j9YQ9Scq/branco.png' 
      : 'https://i.ibb.co/9k52WkvX/preto.png';


    const renderContent = () => {
        if (authMode === 'forgotPassword') {
            return <ForgotPasswordView onBackToLogin={() => setAuthMode('login')} />;
        }
        return (
             <div className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl p-8 shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {authMode === 'signup' && (
                         <>
                            <div>
                                <label className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300" htmlFor="name">{t('auth_name_label')}</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-krypton-blue-500 focus:border-krypton-blue-500"
                                />
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300" htmlFor="handle">{t('auth_handle_label')}</label>
                        <input
                            id="handle"
                            type="text"
                            value={handle}
                            onChange={(e) => {
                                let value = e.target.value;
                                if (!value.startsWith('@')) {
                                    setHandle('@' + value.replace(/@/g, ''));
                                } else {
                                    setHandle(value);
                                }
                            }}
                            onFocus={() => {
                                if (!handle) {
                                    setHandle('@');
                                }
                            }}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-krypton-blue-500 focus:border-krypton-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300" htmlFor="password">{t('auth_password_label')}</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-krypton-blue-500 focus:border-krypton-blue-500"
                        />
                    </div>
                    
                    {authMode === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300" htmlFor="confirm-password">{t('auth_confirm_password_label')}</label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-krypton-blue-500 focus:border-krypton-blue-500"
                            />
                        </div>
                    )}


                     {authMode === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300" htmlFor="keyword">{t('auth_keyword_label')}</label>
                             <input
                                id="keyword"
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-krypton-blue-500 focus:border-krypton-blue-500"
                            />
                            <p className="mt-1 text-xs text-light-text-secondary dark:text-krypton-gray-500">{t('auth_keyword_subtitle')}</p>
                        </div>
                    )}


                     {error && (
                        <div className="bg-red-100/10 border border-krypton-danger/30 text-krypton-danger p-3 rounded-md flex items-center text-sm">
                            <AlertTriangleIcon className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-krypton-blue-500 disabled:opacity-50"
                        >
                            {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? t('auth_login_button') : t('auth_signup_button'))}
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center text-sm">
                    {authMode === 'login' && (
                        <button onClick={() => setAuthMode('forgotPassword')} className="font-medium text-krypton-blue-500 hover:underline">
                            {t('auth_forgot_password_button')}
                        </button>
                    )}
                </div>
                <p className="mt-2 text-center text-sm text-light-text-secondary dark:text-krypton-gray-400">
                    {authMode === 'login' ? t('auth_toggle_to_signup') : t('auth_toggle_to_login')}{' '}
                    <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(null); }} className="font-medium text-krypton-blue-500 hover:underline">
                        {authMode === 'login' ? t('auth_signup_button') : t('auth_login_button')}
                    </button>
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-krypton-gray-900 p-4 animate-fade-in">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                     <img src={logoUrl} alt="APOLO Logo" className="h-10 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-light-text-primary dark:text-white">{t('auth_welcome_title')}</h1>
                    <p className="text-light-text-secondary dark:text-krypton-gray-400">{t('auth_welcome_subtitle')}</p>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default AuthView;