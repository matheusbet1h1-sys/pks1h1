import React, { useEffect, useRef } from 'react';
import type { Notification } from '../types';
import { useLanguage } from './LanguageProvider';
import { HeartIcon, MessageCircleIcon, UserPlusIcon } from './icons';

interface NotificationPanelProps {
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
    onClearAll: () => void;
    onClose: () => void;
}

function formatTimeAgo(date: Date, lang: 'pt' | 'en'): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return lang === 'pt' ? 'agora' : 'now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    return `${days}d`;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onNotificationClick, onClearAll, onClose }) => {
    const { t, language } = useLanguage();
    const panelRef = useRef<HTMLDivElement>(null);

    // This logic is for the desktop dropdown. The mobile version is handled by MobilePanel in App.tsx
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // FIX: Add a check for `offsetParent`. An element with `display: none` (like the hidden desktop panel on mobile)
            // will have a null `offsetParent`. This prevents the desktop outside-click logic from running on mobile screens.
            if (panelRef.current && panelRef.current.offsetParent !== null && !panelRef.current.contains(event.target as Node)) {
                const target = event.target as HTMLElement;
                // Check if the click was on the bell icon itself or inside it
                if (!target.closest('[aria-label="Toggle notifications"]')) {
                    onClose();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);
    

    const renderNotificationContent = (notification: Notification) => {
        const { actor, type, signal } = notification;
        let icon: React.ReactNode;
        let message: React.ReactNode;

        switch (type) {
            case 'LIKE':
                icon = <HeartIcon className="w-5 h-5 text-krypton-danger" />;
                message = (
                    <p className="text-sm text-light-text-secondary dark:text-krypton-gray-300">
                        <span className="font-bold text-light-text-primary dark:text-white">{actor.name}</span> {t('notification_like')}{' '}
                        <span className="italic">"{signal?.title}"</span>
                    </p>
                );
                break;
            case 'COMMENT':
                 icon = <MessageCircleIcon className="w-5 h-5 text-krypton-blue-500" />;
                 message = (
                    <p className="text-sm text-light-text-secondary dark:text-krypton-gray-300">
                        <span className="font-bold text-light-text-primary dark:text-white">{actor.name}</span> {t('notification_comment')}{' '}
                        <span className="italic">"{signal?.title}"</span>
                    </p>
                );
                break;
            case 'FOLLOW':
                icon = <UserPlusIcon className="w-5 h-5 text-krypton-success" />;
                message = (
                    <p className="text-sm text-light-text-secondary dark:text-krypton-gray-300">
                        <span className="font-bold text-light-text-primary dark:text-white">{actor.name}</span> {t('notification_follow')}
                    </p>
                );
                break;
            default:
                return null;
        }

        return (
            <div className="flex items-start space-x-3">
                <div className="mt-1">{icon}</div>
                <div className="flex-1">
                    <img src={actor.avatarUrl} alt={actor.name} className="w-8 h-8 rounded-full mb-2" />
                    {message}
                </div>
            </div>
        )
    };
    
    const notificationList = (
        <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                    <p className="text-sm text-light-text-secondary dark:text-krypton-gray-400">{t('notifications_empty')}</p>
                </div>
            ) : (
                <ul>
                    {notifications.map((n, index) => (
                       <li key={n.id}>
                         <button
                           onClick={() => onNotificationClick(n)}
                           className={`w-full text-left p-3 flex items-start space-x-3 transition-colors hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 ${index > 0 ? 'border-t border-light-border dark:border-krypton-gray-700/50' : ''}`}
                         >
                           {!n.read && <div className="w-2 h-2 rounded-full bg-krypton-blue-500 mt-1.5 flex-shrink-0" aria-label="Unread"></div>}
                           <div className={`flex-1 ${n.read ? 'pl-2' : ''}`}>
                               {renderNotificationContent(n)}
                               <time className="text-xs text-light-text-secondary dark:text-krypton-gray-500 mt-1">
                                   {formatTimeAgo(n.timestamp, language)}
                               </time>
                           </div>
                         </button>
                       </li>
                    ))}
                </ul>
            )}
        </div>
    );

    return (
        <>
            {/* Desktop Dropdown */}
            <div
              ref={panelRef}
              className="absolute top-14 right-0 w-80 max-w-sm bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-xl shadow-2xl animate-fade-in z-50 hidden md:block"
            >
                <header className="flex justify-between items-center p-3 border-b border-light-border dark:border-krypton-gray-700">
                    <h3 className="font-bold text-base">{t('notifications_title')}</h3>
                    {notifications.length > 0 && (
                        <button onClick={onClearAll} className="text-xs text-krypton-blue-500 hover:underline">
                            {t('notifications_clear_all')}
                        </button>
                    )}
                </header>
                {notificationList}
            </div>
            
            {/* Mobile Panel Content */}
            <div className="md:hidden">
                {notificationList}
            </div>
        </>
    );
};

export default NotificationPanel;