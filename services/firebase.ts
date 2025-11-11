

// FIX: The specified import for initializeApp was causing an error. Using a namespace
// import for firebase/app can resolve module resolution issues in certain environments.
// Correcting Firebase imports to use v9 modular syntax.
// The previous namespace import for `firebase/app` was incorrect.
import { initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { 
    getFirestore, collection, query, where, getDocs, limit, doc, getDoc, setDoc, 
    runTransaction, increment, serverTimestamp, onSnapshot, orderBy, writeBatch, 
    addDoc, updateDoc, arrayUnion, deleteField, deleteDoc
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import type { UserProfile, Notification, Signal, CurrentUserProfile, Comment, IntegrityAnalysis } from "../types";

// TODO: Replace the following with your app's Firebase project configuration
// For more information on how to get this, visit:
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyBMHkOjas16kAu-SBZUdFXJcsc7lkavf5c",
  authDomain: "atlas-e4076.firebaseapp.com",
  projectId: "atlas-e4076",
  storageBucket: "atlas-e4076.firebasestorage.app",
  messagingSenderId: "845228863549",
  appId: "1:845228863549:web:dd3c1565b63efca7107a54"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = firebaseAuth.getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper to create a plain user profile object for Firestore, preventing circular references.
const createPlainUserProfile = (profile: UserProfile): any => {
    const plainProfile: any = {
        id: profile.id,
        name: profile.name,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl,
        isVerified: profile.isVerified,
        bio: profile.bio,
        followers: profile.followers,
        following: profile.following,
        walletHash: profile.walletHash,
    };
    if (profile.isBot !== undefined) {
        plainProfile.isBot = profile.isBot;
    }
    if (profile.name_lowercase) {
        plainProfile.name_lowercase = profile.name_lowercase;
    }
    if (profile.handle_lowercase) {
        plainProfile.handle_lowercase = profile.handle_lowercase;
    }
    return plainProfile;
};


const cointelegraphProfileData: UserProfile = {
  id: 'cointelegraph_official',
  name: 'Cointelegraph',
  handle: '@Cointelegraph',
  avatarUrl: 'https://pbs.twimg.com/profile_images/1473611339396759553/HSj3h528_400x400.jpg',
  isVerified: true,
  bio: 'Automated feed of the latest news on blockchain technology, crypto assets, and emerging fintech trends from Cointelegraph.',
  followers: 0,
  following: 0,
  walletHash: '0xc738a2e1a2d3f4b56c7d8e9f0a1b2c3d4e5f6a7b',
  isBot: true,
  name_lowercase: 'cointelegraph',
  handle_lowercase: '@cointelegraph',
};

/**
 * Checks for the Cointelegraph profile in Firestore. If it doesn't exist, it creates it.
 * This ensures the news source is a real, queryable entity in the database.
 * @returns A promise that resolves to the Cointelegraph user profile.
 */
export const getOrCreateCointelegraphProfile = async (): Promise<UserProfile> => {
    const userDocRef = doc(db, "users", cointelegraphProfileData.id);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        return userDocSnap.data() as UserProfile;
    } else {
        console.log("Cointelegraph profile not found. Creating a new one in Firestore.");
        await setDoc(userDocRef, cointelegraphProfileData);
        return cointelegraphProfileData;
    }
};

/**
 * Fetches the IDs of users that the given user is following.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of followed user IDs.
 */
export const getFollowingIds = async (userId: string): Promise<string[]> => {
    if (!userId) return [];
    try {
        const followingRef = collection(db, 'users', userId, 'following');
        const querySnapshot = await getDocs(followingRef);
        return querySnapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error fetching following list:", error);
        return [];
    }
};

/**
 * Fetches the IDs of users who are following the given user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of follower user IDs.
 */
export const getFollowerIds = async (userId: string): Promise<string[]> => {
    if (!userId) return [];
    try {
        const followersRef = collection(db, 'users', userId, 'followers');
        const querySnapshot = await getDocs(followersRef);
        return querySnapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error fetching follower list:", error);
        return [];
    }
};

/**
 * Fetches a single user profile from Firestore.
 * @param userId The ID of the user to fetch.
 * @returns A promise that resolves to the user profile, or null if not found.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!userId) return null;
    try {
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            return { id: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
        }
        console.warn(`Profile not found for user ${userId}`);
        return null;
    } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Fetches a user profile by their handle.
 * @param handle The user's handle (e.g., "@username").
 * @returns A promise that resolves to the user profile, or null if not found.
 */
export const getUserByHandle = async (handle: string): Promise<CurrentUserProfile | null> => {
    if (!handle) return null;
    const cleanedHandle = (handle.startsWith('@') ? handle : `@${handle}`).toLowerCase();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('handle_lowercase', '==', cleanedHandle), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    return querySnapshot.docs[0].data() as CurrentUserProfile;
};

/**
 * Fetches a user profile by their wallet hash.
 * @param hash The user's wallet hash.
 * @returns A promise that resolves to the user profile, or null if not found.
 */
export const getUserByWalletHash = async (hash: string): Promise<CurrentUserProfile | null> => {
    if (!hash) return null;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('walletHash', '==', hash), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    return querySnapshot.docs[0].data() as CurrentUserProfile;
};


/**
 * Toggles the follow state between two users and updates their respective counts.
 * Uses a transaction to ensure atomicity.
 * @param currentUserId The ID of the user performing the action.
 * @param targetUserId The ID of the user being followed/unfollowed.
 * @param isCurrentlyFollowing True if the current user is already following the target user.
 */
export const toggleFollow = async (currentUserId: string, targetUserId: string, isCurrentlyFollowing: boolean): Promise<void> => {
    const currentUserRef = doc(db, "users", currentUserId);
    const targetUserRef = doc(db, "users", targetUserId);
    const followingDocRef = doc(db, `users/${currentUserId}/following/${targetUserId}`);
    const followerDocRef = doc(db, `users/${targetUserId}/followers/${currentUserId}`);

    await runTransaction(db, async (transaction) => {
        if (isCurrentlyFollowing) {
            // --- UNFOLLOW LOGIC ---
            transaction.delete(followingDocRef);
            transaction.delete(followerDocRef);
            transaction.update(currentUserRef, { following: increment(-1) });
            transaction.update(targetUserRef, { followers: increment(-1) });
        } else {
            // --- FOLLOW LOGIC ---
            transaction.set(followingDocRef, { timestamp: serverTimestamp() });
            transaction.set(followerDocRef, { timestamp: serverTimestamp() });
            transaction.update(currentUserRef, { following: increment(1) });
            transaction.update(targetUserRef, { followers: increment(1) });
        }
    });
};


/**
 * Searches for users in Firestore by their handle.
 * This function is designed to be resilient to inconsistencies in the database,
 * searching for handles stored with or without a leading '@'.
 * It performs two parallel queries and merges the results.
 * @param searchText The text to search for.
 * @returns A promise that resolves to an array of matching user profiles.
 */
export const searchUsers = async (searchText: string): Promise<UserProfile[]> => {
    let cleanedSearchText = searchText.toLowerCase().trim();
    if (cleanedSearchText.length < 2) return [];

    // Standardize search by removing the '@' if the user typed it
    if (cleanedSearchText.startsWith('@')) {
        cleanedSearchText = cleanedSearchText.substring(1);
    }

    const usersRef = collection(db, 'users');
    
    // Query 1: Find handles stored with the '@' prefix (e.g., @johnny)
    const queryWithAt = query(
        usersRef,
        where('handle_lowercase', '>=', `@${cleanedSearchText}`),
        where('handle_lowercase', '<=', `@${cleanedSearchText}\uf8ff`),
        limit(10)
    );
    
    // Query 2: Find handles stored without the '@' prefix (e.g., johnny)
    const queryWithoutAt = query(
        usersRef,
        where('handle_lowercase', '>=', cleanedSearchText),
        where('handle_lowercase', '<=', `${cleanedSearchText}\uf8ff`),
        limit(10)
    );

    try {
        const [withAtSnapshot, withoutAtSnapshot] = await Promise.all([
            getDocs(queryWithAt),
            getDocs(queryWithoutAt)
        ]);
        
        const resultsMap = new Map<string, UserProfile>();

        // Add results from the first query
        withAtSnapshot.forEach(doc => {
            if (!resultsMap.has(doc.id)) {
                resultsMap.set(doc.id, { ...(doc.data() as UserProfile), id: doc.id });
            }
        });

        // Add results from the second query, avoiding duplicates
        withoutAtSnapshot.forEach(doc => {
            // A handle like 'johnny' would be found by queryWithoutAt but not by queryWithAt.
            // A handle like '@johnny' would be found by queryWithAt but not by queryWithoutAt.
            // This ensures both are found. Using a map prevents any weird edge cases.
            if (!resultsMap.has(doc.id)) {
                resultsMap.set(doc.id, { ...(doc.data() as UserProfile), id: doc.id });
            }
        });
        
        return Array.from(resultsMap.values());

    } catch (error) {
        console.error("Error during user search:", error);
        return []; // Return empty array on error
    }
};

// --- Signal Service Functions ---

/**
 * Creates a new signal document. If the signal is a repost/quote, it also
 * transactionally increments the repost count on the original signal.
 * @param author The profile of the user creating the signal.
 * @param signalData The rest of the signal's data.
 */
export const createSignal = async (
  author: CurrentUserProfile, 
  signalData: Omit<Signal, 'id' | 'author' | 'timestamp' | 'stats' | 'integrityAnalysis' | 'comments'> & { quotedSignal?: Signal }
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
        // --- ALL READS MUST HAPPEN BEFORE WRITES ---
        let originalSignalDoc = null;
        let originalSignalRef = null;

        if (signalData.quotedSignal) {
            originalSignalRef = doc(db, 'signals', signalData.quotedSignal.id);
            // READ operation
            originalSignalDoc = await transaction.get(originalSignalRef);
        }
        
        // --- ALL WRITES HAPPEN AFTER READS ---
        const signalsCollectionRef = collection(db, 'signals');
        const newSignalRef = doc(signalsCollectionRef); // Auto-generate ID

        const dataToSave: { [key: string]: any } = { ...signalData };

        if (dataToSave.quotedSignal) {
            const cleanQuotedSignal = { ...dataToSave.quotedSignal };
            if (cleanQuotedSignal.integrityAnalysis === undefined) {
                delete cleanQuotedSignal.integrityAnalysis;
            }
            dataToSave.quotedSignal = cleanQuotedSignal;
        }

        const newSignalPayload = {
          ...dataToSave,
          author: {
            id: author.id, name: author.name, handle: author.handle, avatarUrl: author.avatarUrl,
            isVerified: author.isVerified, bio: author.bio, followers: author.followers,
            following: author.following, walletHash: author.walletHash,
          },
          timestamp: serverTimestamp(),
          stats: { likes: 0, reposts: 0, comments: 0 },
          comments: [],
        };

        // WRITE 1: Create the new signal (the repost itself)
        transaction.set(newSignalRef, newSignalPayload);

        // If it's a repost/quote, update the original signal's stats
        if (signalData.quotedSignal && originalSignalRef) {
            // WRITE 2: Record that this user has reposted this signal
            const userRepostedRef = doc(db, `users/${author.id}/repostedSignals/${signalData.quotedSignal.id}`);
            transaction.set(userRepostedRef, { signalId: signalData.quotedSignal.id, timestamp: serverTimestamp() });
            
            // Use the previously read document to decide the next write.
            if (originalSignalDoc && originalSignalDoc.exists()) {
                // WRITE 3 (Option A): Update the existing original signal's stats
                transaction.update(originalSignalRef, { 'stats.reposts': increment(1) });
            } else {
                // WRITE 3 (Option B): Create the original signal in Firestore (for news signals)
                const originalSignal = signalData.quotedSignal;
                const dataToCreate = {
                    type: originalSignal.type,
                    dataType: originalSignal.dataType,
                    author: await getOrCreateCointelegraphProfile(), // Use canonical author to ensure isBot is set
                    timestamp: originalSignal.timestamp, // Preserve the original Date object from the RSS feed
                    content: originalSignal.content,
                    title: originalSignal.title,
                    source: originalSignal.source,
                    tokenTags: originalSignal.tokenTags,
                    signalStrength: originalSignal.signalStrength,
                    stats: { likes: 0, reposts: 1, comments: 0 }, // Set initial stats for the new doc
                    comments: [], // New doc has no comments
                    // Explicitly do not include integrityAnalysis, quotedSignal, or other fields
                };
                transaction.set(originalSignalRef, dataToCreate);
            }
        }
    });
  } catch (error) {
    console.error("Error creating signal:", error);
    throw error;
  }
};


/**
 * Deletes a signal. If the signal is a repost, it transactionally decrements
 * the repost count on the original signal.
 * @param signalToDelete The full Signal object to delete.
 */
export const deleteSignal = async (signalToDelete: Signal): Promise<void> => {
  if (!signalToDelete) return;

  try {
    await runTransaction(db, async (transaction) => {
      const signalRef = doc(db, 'signals', signalToDelete.id);

      // If the deleted signal is a repost or quote, decrement the original's count
      if (signalToDelete.quotedSignal && signalToDelete.quotedSignal.id) {
        const originalSignalRef = doc(db, 'signals', signalToDelete.quotedSignal.id);
        const originalSignalDoc = await transaction.get(originalSignalRef);

        // Decrement repost count on the original signal if it exists
        if (originalSignalDoc.exists()) {
          const currentReposts = originalSignalDoc.data()?.stats?.reposts ?? 0;
          if (currentReposts > 0) {
             transaction.update(originalSignalRef, { 'stats.reposts': increment(-1) });
          }
        }

        // Also, remove the record of the user reposting this signal
        const userRepostedRef = doc(db, `users/${signalToDelete.author.id}/repostedSignals/${signalToDelete.quotedSignal.id}`);
        transaction.delete(userRepostedRef);
      }

      // Finally, delete the signal document itself
      transaction.delete(signalRef);
    });
  } catch (error) {
    console.error(`Failed to delete signal ${signalToDelete.id}:`, error);
    throw error;
  }
};


/**
 * Sets up a real-time listener for the signals collection.
 * @param callback The function to call with the array of signals.
 * @returns The unsubscribe function for the listener.
 */
export const getSignalsListener = (callback: (signals: Signal[]) => void): (() => void) => {
    const signalsCollectionRef = collection(db, 'signals');
    const q = query(signalsCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const signals = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const comments = (data.comments || []).map((comment: any) => ({
                ...comment,
                timestamp: comment.timestamp?.toDate() || new Date(),
            }));

            const signal: Signal = {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(),
                comments,
            } as Signal;

            // FIX: Convert the timestamp of the nested quoted signal from a Firestore Timestamp
            // to a JavaScript Date object. This prevents crashes in UI components.
            if (signal.quotedSignal && data.quotedSignal.timestamp && typeof data.quotedSignal.timestamp.toDate === 'function') {
                signal.quotedSignal.timestamp = data.quotedSignal.timestamp.toDate();
            }
            
            return signal;
        });
        callback(signals);
    }, (error) => {
        console.error("Error in signals listener:", error);
    });

    return unsubscribe;
};

/**
 * Fetches all signals in a single batch, ordered chronologically.
 * @returns A promise that resolves to an array of signals.
 */
export const getSignals = async (): Promise<Signal[]> => {
    const signalsCollectionRef = collection(db, 'signals');
    // Order by ascending to build the blockchain in chronological order
    const q = query(signalsCollectionRef, orderBy('timestamp', 'asc'));

    try {
        const querySnapshot = await getDocs(q);
        const signals = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const comments = (data.comments || []).map((comment: any) => ({
                ...comment,
                timestamp: comment.timestamp?.toDate() || new Date(),
            }));

            const signal: Signal = {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(),
                comments,
            } as Signal;

            if (signal.quotedSignal && data.quotedSignal.timestamp && typeof data.quotedSignal.timestamp.toDate === 'function') {
                signal.quotedSignal.timestamp = data.quotedSignal.timestamp.toDate();
            }
            
            return signal;
        });
        return signals;
    } catch (error) {
        console.error("Error fetching all signals:", error);
        return [];
    }
};


/**
 * Adds a comment to a signal and increments the comment count. Uses a transaction to safely
 * create the signal document if it doesn't exist (e.g., for news signals).
 * @param signal The signal object to comment on.
 * @param commentData The data for the new comment.
 * @param replyingTo Optional object indicating who is being replied to.
 */
export const addCommentToSignal = async (
    signal: Signal,
    commentData: Omit<Comment, 'id' | 'replyingTo'>,
    replyingTo?: { authorId: string; authorHandle: string }
): Promise<void> => {
    const signalRef = doc(db, 'signals', signal.id);
    
    const newComment: Comment = {
        ...commentData,
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    if (replyingTo) {
        newComment.replyingTo = replyingTo;
    }
    
    const canonicalAuthor = signal.author.isBot
        ? await getOrCreateCointelegraphProfile()
        : null;

    try {
        await runTransaction(db, async (transaction) => {
            const signalDoc = await transaction.get(signalRef);
            if (signalDoc.exists()) {
                // Document exists, update it
                transaction.update(signalRef, {
                    comments: arrayUnion(newComment),
                    'stats.comments': increment(1)
                });
            } else {
                // Document doesn't exist, create it (for news signals)
                const authorToSet = canonicalAuthor ? canonicalAuthor : createPlainUserProfile(signal.author);
                
                const dataToCreate: any = {
                    type: signal.type,
                    dataType: signal.dataType,
                    author: authorToSet,
                    timestamp: signal.timestamp,
                    content: signal.content,
                    title: signal.title,
                    source: signal.source,
                    tokenTags: signal.tokenTags,
                    signalStrength: signal.signalStrength,
                    stats: { ...(signal.stats || { likes: 0, reposts: 0 }), comments: 1 },
                    comments: [newComment],
                };

                if (signal.quotedSignal) {
                    dataToCreate.quotedSignal = {
                        id: signal.quotedSignal.id,
                        author: createPlainUserProfile(signal.quotedSignal.author),
                        timestamp: signal.quotedSignal.timestamp,
                        content: signal.quotedSignal.content,
                        title: signal.quotedSignal.title,
                    };
                }
                
                if (signal.integrityAnalysis !== undefined) {
                    dataToCreate.integrityAnalysis = signal.integrityAnalysis;
                }

                transaction.set(signalRef, dataToCreate);
            }
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
    }
};


/**
 * Toggles a like or repost on a signal atomically. This function reads the interaction
 * state within a transaction to prevent race conditions from rapid clicks.
 * @param signal The signal being interacted with.
 * @param currentUser The user performing the action.
 * @param type The type of interaction, 'like' or 'repost'.
 */
export const toggleInteraction = async (
    signal: Signal,
    currentUser: CurrentUserProfile,
    type: 'like' | 'repost'
): Promise<void> => {
    const signalId = signal.id;
    const currentUserId = currentUser.id;
    const signalAuthorId = signal.author.id;

    const signalRef = doc(db, 'signals', signalId);
    const interactionCollection = type === 'like' ? 'likes' : 'reposts';
    const userInteractionCollection = type === 'like' ? 'likedSignals' : 'repostedSignals';
    const statField = type === 'like' ? 'likes' : 'reposts';

    const signalInteractionRef = doc(db, `signals/${signalId}/${interactionCollection}/${currentUserId}`);
    const userInteractionRef = doc(db, `users/${currentUserId}/${userInteractionCollection}/${signalId}`);

    const canonicalAuthor = signal.author.isBot
        ? await getOrCreateCointelegraphProfile()
        : null;

    let isNewInteraction = false;

    await runTransaction(db, async (transaction) => {
        const signalDoc = await transaction.get(signalRef);
        const userInteractionDoc = await transaction.get(signalInteractionRef);

        if (userInteractionDoc.exists()) {
            // --- UN-INTERACT LOGIC ---
            transaction.delete(signalInteractionRef);
            transaction.delete(userInteractionRef);
            if (signalDoc.exists()) {
                const currentStatValue = signalDoc.data()?.stats?.[statField] ?? 0;
                if (currentStatValue > 0) {
                    transaction.update(signalRef, { [`stats.${statField}`]: increment(-1) });
                }
            }
            isNewInteraction = false;
        } else {
            // --- INTERACT LOGIC ---
            transaction.set(signalInteractionRef, { userId: currentUserId, timestamp: serverTimestamp() });
            transaction.set(userInteractionRef, { signalId: signalId, timestamp: serverTimestamp() });

            if (signalDoc.exists()) {
                transaction.update(signalRef, { [`stats.${statField}`]: increment(1) });
            } else {
                const newStats: { [key: string]: any } = { likes: 0, reposts: 0, comments: 0, ...(signal.stats || {}) };
                newStats[statField] = 1;
                const authorToSet = canonicalAuthor ? canonicalAuthor : createPlainUserProfile(signal.author);

                const dataToCreate: any = {
                    type: signal.type,
                    dataType: signal.dataType,
                    author: authorToSet,
                    timestamp: signal.timestamp,
                    content: signal.content,
                    title: signal.title,
                    source: signal.source,
                    tokenTags: signal.tokenTags,
                    signalStrength: signal.signalStrength,
                    stats: newStats,
                    comments: signal.comments || [],
                };
                if (signal.quotedSignal) {
                    dataToCreate.quotedSignal = {
                        id: signal.quotedSignal.id,
                        author: createPlainUserProfile(signal.quotedSignal.author),
                        timestamp: signal.quotedSignal.timestamp,
                        content: signal.quotedSignal.content,
                        title: signal.quotedSignal.title,
                    };
                }
                if (signal.integrityAnalysis !== undefined) {
                    dataToCreate.integrityAnalysis = signal.integrityAnalysis;
                }
                transaction.set(signalRef, dataToCreate);
            }
            isNewInteraction = true;
        }
    });

    // Create a notification outside the transaction if it's a new interaction and not on your own post
    if (isNewInteraction && currentUserId !== signalAuthorId) {
        if (type === 'like') {
            createNotification(signalAuthorId, {
                type: 'LIKE',
                actor: currentUser,
                signal: signal,
            });
        }
    }
};

/**
 * Fetches the user's liked and reposted signal IDs.
 * @param userId The ID of the current user.
 * @returns An object containing sets of liked and reposted signal IDs.
 */
export const getUserInteractions = async (userId: string): Promise<{ liked: Set<string>, reposted: Set<string> }> => {
    if (!userId) return { liked: new Set<string>(), reposted: new Set<string>() };
    try {
        const likedSignalsRef = collection(db, `users/${userId}/likedSignals`);
        const repostedSignalsRef = collection(db, `users/${userId}/repostedSignals`);

        const [likedSnapshot, repostedSnapshot] = await Promise.all([
            getDocs(likedSignalsRef),
            getDocs(repostedSignalsRef)
        ]);
        
        const liked = new Set<string>(likedSnapshot.docs.map(doc => doc.id));
        const reposted = new Set<string>(repostedSnapshot.docs.map(doc => doc.id));
        
        return { liked, reposted };

    } catch (error) {
        console.error("Error fetching user interactions:", error);
        return { liked: new Set<string>(), reposted: new Set<string>() };
    }
};


// --- Notification Service Functions ---

/**
 * Creates a notification document in the target user's notification subcollection.
 * @param targetUserId The user who will receive the notification.
 * @param notificationData The content of the notification.
 */
export const createNotification = async (targetUserId: string, notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<void> => {
    const cleanData: {[key: string]: any} = {
        type: notificationData.type,
        actor: createPlainUserProfile(notificationData.actor)
    };
    
    if (notificationData.signal) {
        const signal = notificationData.signal;
        // Notifications only need a subset of signal data to display.
        cleanData.signal = {
            id: signal.id,
            title: signal.title,
            content: signal.content,
            author: createPlainUserProfile(signal.author)
        };
    }

    if (notificationData.targetUser) {
        cleanData.targetUser = createPlainUserProfile(notificationData.targetUser);
    }

    try {
        const notifCollectionRef = collection(db, `users/${targetUserId}/notifications`);
        await addDoc(notifCollectionRef, {
            ...cleanData,
            timestamp: serverTimestamp(),
            read: false,
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

/**
 * Sets up a real-time listener for a user's notifications.
 * @param userId The ID of the user whose notifications to listen for.
 * @param callback The function to call with the array of notifications.
 * @returns The unsubscribe function for the listener.
 */
export const getNotificationsListener = (userId: string, callback: (notifications: Notification[]) => void): (() => void) => {
    const notifCollectionRef = collection(db, `users/${userId}/notifications`);
    const q = query(notifCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notifications = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date()
            } as Notification;
        });
        callback(notifications);
    }, (error) => {
        console.error("Error in notification listener:", error);
    });

    return unsubscribe;
};

/**
 * Marks all of a user's unread notifications as read.
 * @param userId The ID of the user.
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    const notifCollectionRef = collection(db, `users/${userId}/notifications`);
    const q = query(notifCollectionRef, where('read', '==', false));
    
    try {
        const unreadSnapshot = await getDocs(q);
        if (unreadSnapshot.empty) return;

        const batch = writeBatch(db);
        unreadSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
};

/**
 * Deletes all notifications for a given user.
 * @param userId The ID of the user.
 */
export const clearAllNotifications = async (userId: string): Promise<void> => {
    const notifCollectionRef = collection(db, `users/${userId}/notifications`);
    try {
        const snapshot = await getDocs(notifCollectionRef);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error clearing all notifications:", error);
    }
};

/**
 * Updates a signal's integrity analysis field in Firestore. Creates the signal document
 * if it doesn't exist (for news signals).
 * @param signal The full signal object.
 * @param analysisUpdate The analysis data, null for pending, or 'DELETE' to reset.
 */
export const updateSignalAnalysis = async (
    signal: Signal,
    analysisUpdate: IntegrityAnalysis | null | 'DELETE'
): Promise<void> => {
    const signalRef = doc(db, 'signals', signal.id);
    
    const canonicalAuthor = signal.author.isBot
        ? await getOrCreateCointelegraphProfile()
        : null;

    await runTransaction(db, async (transaction) => {
        const signalDoc = await transaction.get(signalRef);
        
        if (signalDoc.exists()) {
            const newAnalysisState = analysisUpdate === 'DELETE' ? deleteField() : analysisUpdate;
            transaction.update(signalRef, { integrityAnalysis: newAnalysisState });
        } else {
            const authorToSet = canonicalAuthor ? canonicalAuthor : createPlainUserProfile(signal.author);
            
            const dataToSet: any = {
                type: signal.type,
                dataType: signal.dataType,
                author: authorToSet,
                timestamp: signal.timestamp,
                content: signal.content,
                title: signal.title,
                source: signal.source,
                tokenTags: signal.tokenTags,
                signalStrength: signal.signalStrength,
                stats: signal.stats || { likes: 0, reposts: 0, comments: 0 },
                comments: signal.comments || [],
            };

            if (signal.quotedSignal) {
                 dataToSet.quotedSignal = {
                    id: signal.quotedSignal.id,
                    author: createPlainUserProfile(signal.quotedSignal.author),
                    timestamp: signal.quotedSignal.timestamp,
                    content: signal.quotedSignal.content,
                    title: signal.quotedSignal.title,
                };
            }

            if (analysisUpdate !== 'DELETE') {
                dataToSet.integrityAnalysis = analysisUpdate;
            }
            
            transaction.set(signalRef, dataToSet);
        }
    });
};

/**
 * Deletes the 'integrityAnalysis' field from all signals authored by Cointelegraph.
 * This is intended as a one-time cleanup function.
 */
export const clearCointelegraphAnalyses = async (): Promise<void> => {
    const signalsRef = collection(db, 'signals');
    const q = query(signalsRef, where('author.id', '==', 'cointelegraph_official'));

    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log("No Cointelegraph signals found to clear analysis from.");
            return;
        }

        const batch = writeBatch(db);
        let clearedCount = 0;

        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Check if the field exists before adding to the batch
            if (data.integrityAnalysis !== undefined) {
                batch.update(doc.ref, { integrityAnalysis: deleteField() });
                clearedCount++;
            }
        });

        if (clearedCount > 0) {
            await batch.commit();
            console.log(`Successfully cleared analysis from ${clearedCount} Cointelegraph signals.`);
        } else {
            console.log("No Cointelegraph signals had analyses to clear.");
        }
    } catch (error) {
        console.error("Error clearing Cointelegraph analyses:", error);
        throw error;
    }
};
