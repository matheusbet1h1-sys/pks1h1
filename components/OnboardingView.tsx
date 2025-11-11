import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { useTheme } from './ThemeProvider';
import { LoaderIcon, UploadCloudIcon, UserCircleIcon } from './icons';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ImageCropModal from './ImageCropModal';

const OnboardingView: React.FC = () => {
  const { currentUser, currentUserProfile, updateUserProfile } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [step, setStep] = useState<'picture' | 'bio'>('picture');
  const [bio, setBio] = useState(currentUserProfile?.bio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for image cropper
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [croppedImagePreview, setCroppedImagePreview] = useState<string | null>(null);

  const logoUrl = theme === 'dark'
    ? 'https://i.ibb.co/j9YQ9Scq/branco.png'
    : 'https://i.ibb.co/9k52WkvX/preto.png';

  useEffect(() => {
    // Clean up the object URL to prevent memory leaks
    return () => {
        if (croppedImagePreview) {
            URL.revokeObjectURL(croppedImagePreview);
        }
    };
  }, [croppedImagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
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
    if (croppedImagePreview) {
      URL.revokeObjectURL(croppedImagePreview);
    }
    setCroppedImagePreview(URL.createObjectURL(blob));
    setImageToCrop(null); // Close the cropper modal
  };
  
  const handleUploadAndNext = async () => {
    setError(null);
    if (!croppedImageBlob) {
        setStep('bio');
        return;
    }

    setIsLoading(true);
    try {
        if (!currentUser) throw new Error("User not found");

        const fileName = `${Date.now()}.jpg`;
        const storageRef = ref(storage, `avatars/${currentUser.uid}/${fileName}`);
        
        // Use uploadBytes with explicit contentType metadata for maximum reliability
        const metadata = { contentType: 'image/jpeg' };
        await uploadBytes(storageRef, croppedImageBlob, metadata);
        
        const downloadURL = await getDownloadURL(storageRef);
        await updateUserProfile({ avatarUrl: downloadURL });
        
        setStep('bio');

    } catch (err: any) {
        console.error("ONBOARDING UPLOAD FAILED:", err);
        const detailedError = `${t('onboarding_upload_error')} (Code: ${err.code || 'UNKNOWN'})`;
        setError(detailedError);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleFinish = async () => {
    setIsLoading(true);
    setError(null);
    try {
        await updateUserProfile({
            bio,
            onboardingCompleted: true,
        });
    } catch (error) {
        console.error("Error completing onboarding:", error);
        setError(t('onboarding_finish_error'));
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSkipAndFinish = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await updateUserProfile({ onboardingCompleted: true });
      } catch (error) {
        console.error("Error skipping and finishing onboarding:", error);
        setError(t('onboarding_finish_error'));
      } finally {
        setIsLoading(false);
      }
  };
  
  const renderPictureStep = () => (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t('onboarding_step1_title')}</h2>
        <p className="text-light-text-secondary dark:text-krypton-gray-400 mt-1">{t('onboarding_step1_subtitle')}</p>
      </div>
      <div className="mt-8 flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
          {croppedImagePreview ? (
             <img
                src={croppedImagePreview}
                alt="Profile preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-light-border dark:border-krypton-gray-700"
            />
          ) : (
            <UserCircleIcon className="w-32 h-32 text-gray-300 dark:text-krypton-gray-600" />
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gray-100 dark:bg-krypton-gray-700/80 px-4 py-2 rounded-full font-semibold text-sm flex items-center hover:bg-gray-200 dark:hover:bg-krypton-gray-700"
        >
            <UploadCloudIcon className="w-5 h-5 mr-2" />
            {t('onboarding_upload_button')}
        </button>
        {error && (
            <p className="text-krypton-danger text-sm mt-3 text-center break-words">{error}</p>
        )}
      </div>
      <div className="mt-8 space-y-3">
        <button
            onClick={handleUploadAndNext}
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500 disabled:opacity-50"
        >
            {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : t('onboarding_next_button')}
        </button>
         <button
            onClick={() => setStep('bio')}
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 text-sm font-medium text-light-text-secondary dark:text-krypton-gray-400 hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 rounded-full disabled:opacity-50"
        >
            {t('onboarding_skip_button')}
        </button>
      </div>
    </>
  );

  const renderBioStep = () => (
     <>
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t('onboarding_step2_title')}</h2>
        <p className="text-light-text-secondary dark:text-krypton-gray-400 mt-1">{t('onboarding_step2_subtitle')}</p>
      </div>
      <div className="mt-8 flex flex-col items-center">
        {currentUserProfile?.avatarUrl ? (
            <img
                src={currentUserProfile.avatarUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-4 border-light-border dark:border-krypton-gray-700 mb-4"
            />
        ) : (
            <UserCircleIcon className="w-20 h-20 text-gray-300 dark:text-krypton-gray-600 mb-4" />
        )}
        <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('onboarding_bio_placeholder')}
            maxLength={160}
            className="w-full h-28 bg-white dark:bg-krypton-gray-700 border border-light-border dark:border-krypton-gray-600 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-krypton-blue-500 resize-none"
        />
        <p className="text-xs text-right w-full mt-1 text-light-text-secondary dark:text-krypton-gray-500">{bio.length}/160</p>
         {error && (
            <p className="text-krypton-danger text-sm mt-3 text-center">{error}</p>
        )}
      </div>
      <div className="mt-8 space-y-3">
        <button
            onClick={handleFinish}
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-krypton-blue-600 hover:bg-krypton-blue-500 disabled:opacity-50"
        >
            {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : t('onboarding_finish_button')}
        </button>
        <button
            onClick={handleSkipAndFinish}
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 text-sm font-medium text-light-text-secondary dark:text-krypton-gray-400 hover:bg-gray-100 dark:hover:bg-krypton-gray-700/50 rounded-full disabled:opacity-50"
        >
            {t('onboarding_skip_button')}
        </button>
      </div>
    </>
  );

  return (
    <>
        <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-krypton-gray-900 p-4 animate-fade-in">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <img src={logoUrl} alt="APOLO Logo" className="h-8 mx-auto" />
            </div>
            <div className="bg-light-card dark:bg-krypton-gray-800 border border-light-border dark:border-krypton-gray-700 rounded-2xl p-8 shadow-lg animate-zoom-in">
              {step === 'picture' ? renderPictureStep() : renderBioStep()}
            </div>
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

export default OnboardingView;