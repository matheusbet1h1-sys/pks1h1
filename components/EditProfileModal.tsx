
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { LoaderIcon, XIcon, UserCircleIcon, CheckCircleIcon } from './icons';
import type { CurrentUserProfile } from '../types';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import ImageCropModal from './ImageCropModal';

interface EditProfileModalProps {
  userProfile: CurrentUserProfile;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ userProfile, onClose }) => {
  const { currentUser, updateUserProfile } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState(userProfile.name);
  const [bio, setBio] = useState(userProfile.bio);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for image cropper
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(userProfile.avatarUrl);

  useEffect(() => {
    const isBlobUrl = previewUrl?.startsWith('blob:');
    return () => {
        if (isBlobUrl && previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onCropComplete = (blob: Blob) => {
    setCroppedImageBlob(blob);
    if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(blob));
    setImageToCrop(null);
  };
  
  const handleSaveChanges = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
        if (!currentUser) throw new Error("User not found");

        let newAvatarUrl = userProfile.avatarUrl;

        // A new image was selected for upload
        if (croppedImageBlob) {
            // If there was an old avatar, attempt to delete it from storage
            if (userProfile.avatarUrl) {
                try {
                    const oldAvatarRef = ref(storage, userProfile.avatarUrl);
                    await deleteObject(oldAvatarRef);
                } catch (deleteError) {
                    // Log the error but don't block the profile update
                    console.warn("Failed to delete old avatar:", deleteError);
                }
            }

            // Proceed to upload the new avatar
            const fileName = `${Date.now()}.jpg`;
            const storageRef = ref(storage, `avatars/${currentUser.uid}/${fileName}`);
            
            const metadata = { contentType: 'image/jpeg' };
            await uploadBytes(storageRef, croppedImageBlob, metadata);
            
            newAvatarUrl = await getDownloadURL(storageRef);
        }

        const updatedData: Partial<CurrentUserProfile> = {
            name,
            name_lowercase: name.toLowerCase(),
            bio,
            avatarUrl: newAvatarUrl,
        };

        await updateUserProfile(updatedData);
        setSuccess(t('edit_profile_success'));
        setTimeout(() => {
            onClose();
        }, 1500);

    } catch (err: any) {
        console.error("EDIT PROFILE FAILED:", err);
        const detailedError = `${t('edit_profile_error')} (Code: ${err.code || 'UNKNOWN'})`;
        setError(detailedError);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
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
            <h2 className="text-lg font-bold">{t('edit_profile_title')}</h2>
            <button onClick={onClose} className="text-light-text-secondary dark:text-krypton-gray-400 hover:text-light-text-primary dark:hover:text-white transition-colors">
              <XIcon className="w-6 h-6" />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex flex-col items-center">
                {previewUrl ? (
                     <img src={previewUrl} alt="Profile preview" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                    <UserCircleIcon className="w-24 h-24 text-gray-300 dark:text-krypton-gray-600" />
                )}
                 <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-sm font-semibold text-krypton-blue-500 hover:underline"
                >
                    {t('edit_profile_change_photo')}
                </button>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300">{t('edit_profile_name_label')}</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-krypton-blue-500 focus:border-krypton-blue-500"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-light-text-secondary dark:text-krypton-gray-300">{t('edit_profile_bio_label')}</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                className="mt-1 block w-full h-24 px-3 py-2 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-krypton-blue-500 focus:border-krypton-blue-500 resize-none"
              />
              <p className="text-xs text-right w-full mt-1 text-light-text-secondary dark:text-krypton-gray-500">{bio.length}/160</p>
            </div>
            
             {error && <p className="text-krypton-danger text-sm text-center break-words">{error}</p>}
             {success && 
                <div className="flex items-center justify-center text-krypton-success text-sm">
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    <p>{success}</p>
                </div>
            }

          </main>
          <footer className="p-4 border-t border-light-border dark:border-krypton-gray-700 flex-shrink-0 flex justify-end">
             <button
                onClick={handleSaveChanges}
                disabled={isLoading}
                className="w-40 flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500 disabled:opacity-50"
             >
                {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : t('edit_profile_save_button')}
             </button>
          </footer>
        </div>
      </div>
       {imageToCrop && (
            <ImageCropModal 
                src={imageToCrop}
                onClose={() => setImageToCrop(null)}
                onCropComplete={onCropComplete}
            />
        )}
    </>
  );
};

export default EditProfileModal;