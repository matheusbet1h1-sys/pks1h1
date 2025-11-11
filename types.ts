export type SignalType = 'ON_CHAIN' | 'NEWS' | 'SOCIAL_SENTIMENT' | 'RUMOR' | 'PROJECT_UPDATE';

export interface UserProfile {
  id: string; // Will be Firebase UID
  name: string;
  handle: string;
  avatarUrl: string;
  isVerified: boolean;
  bio: string;
  followers: number;
  following: number;
  walletHash: string; // Unique crypto-style hash
  isBot?: boolean;
  // Fields for case-insensitive search
  name_lowercase?: string;
  handle_lowercase?: string;
}

export interface CurrentUserProfile extends UserProfile {
  email?: string;
  keyword: string; // Essential for account recovery
  atsBalance: string;
  onboardingCompleted: boolean;
}

export interface Comment {
  id: string;
  author: UserProfile;
  timestamp: Date;
  content: string;
  replyingTo?: {
      authorId: string;
      authorHandle: string;
  };
}

export interface Signal {
  id:string;
  type: SignalType;
  dataType: string; // e.g., 'Whale Transaction', 'Exchange Inflow', 'Analyst Report'
  author: UserProfile;
  timestamp: Date;
  content: string;
  title: string;
  source?: string;
  tokenTags: string[];
  signalStrength: number; // A score from 1-100
  stats: {
    likes: number;
    reposts: number;
    comments: number;
  };
  integrityAnalysis?: IntegrityAnalysis | null;
  comments: Comment[];
  quotedSignal?: Signal; // For quote reposts
  isTranslated?: boolean; // For on-demand translation
}

export interface IntegrityAnalysis {
  trustScore: number; // Overall score from 0 to 100
  summary: string; // A one-sentence summary of the findings
  breakdown: {
    manipulationRisk: {
      score: number; // 0-100
      finding: string;
    };
    scamPotential: {
      score: number; // 0-100
      finding: string;
    },
    factuality: {
      score: number; // 0-100
      finding: string;
    }
  };
  sources?: { uri: string; title: string; }[];
}

export interface SignalFilters {
  trustScore: number;
  types: SignalType[];
  tokenTags: string[];
}

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW';

export interface Notification {
  id: string;
  type: NotificationType;
  actor: UserProfile; // The user who performed the action
  targetUser?: UserProfile; // The user who was followed (for FOLLOW type)
  signal?: Signal; // The signal that was acted upon (for LIKE/COMMENT types)
  timestamp: Date;
  read: boolean;
}

export interface EnhancedSignalSuggestion {
  title: string;
  content: string;
}