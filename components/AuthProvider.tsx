
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
// FIX: Using namespace import for firebase auth functions to avoid potential module resolution errors.
import * as firebaseAuth from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, getUserByHandle } from '../services/firebase';
import type { CurrentUserProfile } from '../types';
import type { AuthCredentials } from './AuthView';
import { ethers } from 'ethers';


interface AuthContextType {
    currentUser: User | null;
    currentUserProfile: CurrentUserProfile | null;
    loadingAuth: boolean;
    login: (credentials: {handle: string, password: string}) => Promise<void>;
    signup: (credentials: { name: string; handle: string; password: string; keyword: string; }) => Promise<void>;
    logout: () => Promise<void>;
    updateUserProfile: (data: Partial<CurrentUserProfile>) => Promise<void>;
    // Web3 properties
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    walletAddress: string | null;
    web3Provider: ethers.BrowserProvider | null;
    atsBalance: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Address for a test BEP-20 (USDT) token on BSC Testnet.
// This allows us to fetch a real balance until our own ATS token is deployed.
const ATS_CONTRACT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';

const BSC_TESTNET_CONFIG = {
    chainId: '0x61', // 97 in hex
    chainName: 'BSC Testnet',
    nativeCurrency: {
        name: 'tBNB',
        symbol: 'tBNB',
        decimals: 18,
    },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
};

const generateWalletHash = (): string => {
    const array = new Uint8Array(20);
    window.crypto.getRandomValues(array);
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return `0x${hex}`;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    
    // Web3 State
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [web3Provider, setWeb3Provider] = useState<ethers.BrowserProvider | null>(null);
    const [atsBalance, setAtsBalance] = useState<string | null>(null);
    const [tokenABI, setTokenABI] = useState<any[] | null>(null);

    useEffect(() => {
        const fetchAbi = async () => {
            try {
                const response = await fetch('./abis/ApoloSignalTokenABI.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setTokenABI(data);
            } catch (error) {
                console.error("Could not fetch token ABI:", error);
            }
        };
        fetchAbi();
    }, []);

    useEffect(() => {
        const unsubscribe = firebaseAuth.onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setCurrentUserProfile(userDocSnap.data() as CurrentUserProfile);
                } else {
                    console.warn(`User profile not found for UID: ${user.uid}. A default profile may be created if signup was interrupted.`);
                }
            } else {
                setCurrentUser(null);
                setCurrentUserProfile(null);
            }
            setLoadingAuth(false);
        });

        return () => unsubscribe();
    }, []);
    
    // Check for existing wallet connection on load
    useEffect(() => {
        const checkConnection = async () => {
            if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.listAccounts();
                if (accounts.length > 0 && accounts[0]) {
                    const address = await accounts[0].getAddress();
                    setWeb3Provider(provider);
                    setWalletAddress(address);
                }
            }
        };
        checkConnection();
    }, []);
    
    // Handle wallet account changes
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length > 0 && accounts[0]) {
                    setWalletAddress(accounts[0]);
                } else {
                    disconnectWallet();
                }
            };
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
    }, []);

    // Handle network changes
    useEffect(() => {
        if (window.ethereum) {
            const handleChainChanged = (_chainId: string) => {
                window.location.reload();
            };
            window.ethereum.on('chainChanged', handleChainChanged);
            return () => {
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, []);

    // Reusable function to fetch ATS balance
    const getAtsBalance = async (provider: ethers.BrowserProvider, address: string) => {
        if (!tokenABI) {
            console.warn("Token ABI not loaded, cannot fetch balance.");
            return;
        }

        try {
            const network = await provider.getNetwork();
            if (network.chainId.toString() !== parseInt(BSC_TESTNET_CONFIG.chainId, 16).toString()) {
                setAtsBalance(null);
                return;
            }

            const contract = new ethers.Contract(ATS_CONTRACT_ADDRESS, tokenABI, provider);
            const balance = await contract.balanceOf(address);
            const formattedBalance = parseFloat(ethers.formatUnits(balance, 18)).toFixed(2);
            setAtsBalance(formattedBalance);
        } catch (error) {
            console.error("Failed to fetch ATS token balance:", error);
            setAtsBalance("0.00");
        }
    };
    
    // useEffect to fetch balance when provider, address, or ABI changes.
    // This handles auto-reconnect on page load and account switching.
    useEffect(() => {
        if (web3Provider && walletAddress && tokenABI) {
            getAtsBalance(web3Provider, walletAddress);
        } else {
            setAtsBalance(null);
        }
    }, [web3Provider, walletAddress, tokenABI]);

    const switchToBscTestnet = async () => {
        if (!window.ethereum) return;
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BSC_TESTNET_CONFIG.chainId }],
            });
        } catch (switchError: any) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BSC_TESTNET_CONFIG],
                    });
                } catch (addError) {
                    console.error("Failed to add BSC Testnet", addError);
                    throw addError;
                }
            } else {
                 console.error("Failed to switch to BSC Testnet", switchError);
                 throw switchError;
            }
        }
    };

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                await switchToBscTestnet();
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                
                setWeb3Provider(provider);
                setWalletAddress(address);

                // FIX: Explicitly fetch balance immediately after connecting.
                // This avoids race conditions with React state updates and ensures
                // the balance is fetched reliably every time.
                await getAtsBalance(provider, address);

            } catch (error) {
                console.error("Failed to connect wallet:", error);
            }
        } else {
            alert('Please install MetaMask!');
        }
    };
    
    const disconnectWallet = () => {
        setWeb3Provider(null);
        setWalletAddress(null);
        setAtsBalance(null);
    };

    const login = async ({ handle, password }: {handle: string, password: string}) => {
        const userProfile = await getUserByHandle(handle);
        if (!userProfile || !userProfile.email) {
            throw new Error("auth/user-not-found");
        }
        await firebaseAuth.signInWithEmailAndPassword(auth, userProfile.email, password);
    };

    const signup = async ({ name, handle, password, keyword }: { name: string; handle: string; password: string; keyword: string; }) => {
        const existingUser = await getUserByHandle(handle);
        if (existingUser) {
            throw new Error('auth/handle-already-in-use');
        }

        const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
        const syntheticEmail = `${cleanHandle.toLowerCase().trim()}@apolo-auth.app`;

        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(auth, syntheticEmail, password);
        const user = userCredential.user;
        
        try {
            const finalHandle = handle.startsWith('@') ? handle : `@${handle}`;
            const newUserProfile: CurrentUserProfile = {
                id: user.uid,
                name,
                name_lowercase: name.toLowerCase(),
                handle: finalHandle,
                handle_lowercase: finalHandle.toLowerCase(),
                email: syntheticEmail,
                avatarUrl: '',
                isVerified: false,
                bio: `Welcome to APOLO!`,
                followers: 0,
                following: 0,
                walletHash: generateWalletHash(),
                atsBalance: "0.00",
                onboardingCompleted: false,
                keyword,
            };
            
            await setDoc(doc(db, "users", user.uid), newUserProfile);
        } catch (error) {
            console.error("Error creating Firestore profile during signup. Cleaning up auth user.", error);
            await user.delete();
            throw new Error("Signup failed during profile creation. Please try again.");
        }
    };

    const logout = async () => {
        await firebaseAuth.signOut(auth);
    };
    
    const updateUserProfile = async (data: Partial<CurrentUserProfile>) => {
        if (!currentUser) throw new Error("No user is authenticated to update profile.");
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, data);
        setCurrentUserProfile(prev => {
            if (!prev) return null;
            return { ...prev, ...data };
        });
    };

    const value = {
        currentUser,
        currentUserProfile,
        loadingAuth,
        login,
        signup,
        logout,
        updateUserProfile,
        connectWallet,
        disconnectWallet,
        walletAddress,
        web3Provider,
        atsBalance,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Add this to your global types or a specific web3 types file
declare global {
  interface Window {
    ethereum?: any;
  }
}
