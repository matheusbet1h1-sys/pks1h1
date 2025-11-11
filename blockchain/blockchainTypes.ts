import type { Signal } from '../types';

export type BlockchainTransaction = Signal;

export interface Block {
  index: number;
  timestamp: number;
  transactions: BlockchainTransaction[];
  nonce: number;
  hash: string;
  previousHash: string;
  isMining?: boolean; // For UI state
}
