import React, { useState } from 'react';
import type { Block, BlockchainTransaction } from './blockchainTypes';
import { CopyIcon, CheckIcon, LoaderIcon, GitCommitIcon, VerifiedIcon } from '../components/icons';
import { useLanguage } from '../components/LanguageProvider';

const HashDisplay: React.FC<{ label: string; hash: string, isHighlighted: boolean }> = ({ label, hash, isHighlighted }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="text-xs font-bold text-light-text-secondary dark:text-krypton-gray-400 mb-1 uppercase tracking-wider">{label}</p>
      <div className="flex items-center bg-gray-100 dark:bg-krypton-gray-900/50 rounded-md p-2 border border-transparent has-[:focus]:border-krypton-blue-500">
        <p className={`font-mono text-sm text-krypton-blue-500 break-all flex-1 ${isHighlighted ? 'bg-krypton-accent/30' : ''}`}>{hash}</p>
        <button onClick={handleCopy} className="ml-2 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-krypton-gray-700 focus:outline-none focus:ring-2 focus:ring-krypton-blue-500">
            {copied ? <CheckIcon className="w-4 h-4 text-krypton-success"/> : <CopyIcon className="w-4 h-4 text-light-text-secondary dark:text-krypton-gray-500" />}
        </button>
      </div>
    </div>
  );
};

const TransactionCard: React.FC<{ tx: BlockchainTransaction }> = ({ tx }) => {
    const { translateSignalType } = useLanguage();
    return (
        <div className="bg-gray-50 dark:bg-krypton-gray-900/50 p-2.5 rounded-lg border border-light-border dark:border-krypton-gray-700/80">
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center space-x-2 overflow-hidden">
                    <img src={tx.author.avatarUrl} alt={tx.author.name} className="w-7 h-7 rounded-full flex-shrink-0"/>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold flex items-center truncate">{tx.author.name} {tx.author.isVerified && <VerifiedIcon className="w-3.5 h-3.5 ml-1 text-krypton-blue-500 flex-shrink-0"/>}</p>
                        <p className="text-xs text-light-text-secondary dark:text-krypton-gray-400 truncate">{tx.author.handle}</p>
                    </div>
                </div>
                <span className="text-xs font-semibold bg-krypton-purple/20 text-krypton-purple px-2 py-0.5 rounded-md flex-shrink-0 ml-2">{translateSignalType(tx.type)}</span>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-krypton-gray-300 italic line-clamp-2">"{tx.title || tx.content}"</p>
        </div>
    )
}

// FIX: Add searchTerm to the props interface to make it available for highlighting logic.
export const BlockCard: React.FC<{ block: Block; isHighlighted: boolean; searchTerm: string; }> = ({ block, isHighlighted, searchTerm }) => {
  if (block.isMining) {
    return (
        <div className="relative pl-24">
            <div className="absolute left-10 top-1/2 w-14 border-t-2 border-dashed border-gray-300 dark:border-krypton-gray-600 -translate-y-1/2"></div>
            <div className="absolute left-10 top-1/2 -ml-5 w-10 h-10 rounded-full bg-light-bg dark:bg-krypton-gray-900 border-4 border-light-border dark:border-krypton-gray-700 flex items-center justify-center">
                 <LoaderIcon className="w-6 h-6 text-krypton-accent animate-spin" />
            </div>
            <div className="bg-light-card dark:bg-krypton-gray-800 border-2 border-dashed border-krypton-accent/50 rounded-xl p-4 animate-pulse">
                <div className="flex items-center justify-center space-x-3">
                    <p className="text-center font-semibold text-krypton-accent">Mining Block #{block.index}...</p>
                </div>
            </div>
        </div>
    );
  }

  const highlightClass = isHighlighted ? 'border-krypton-accent shadow-krypton-accent/30' : 'border-light-border dark:border-krypton-gray-700 shadow-black/20';

  return (
    <div className="relative pl-24 animate-fade-in">
        <div className="absolute left-10 top-1/2 w-14 border-t-2 border-gray-300 dark:border-krypton-gray-700 -translate-y-1/2"></div>
        <div className="absolute left-10 top-1/2 -ml-5 w-10 h-10 rounded-full bg-light-bg dark:bg-krypton-gray-900 border-4 border-krypton-blue-500 flex items-center justify-center">
            <GitCommitIcon className="w-6 h-6 text-krypton-blue-500"/>
        </div>

      <div className={`bg-light-card dark:bg-krypton-gray-800 border rounded-2xl overflow-hidden shadow-lg transition-all ${highlightClass} ${block.index === 0 ? 'animate-pulse-glow' : ''}`}>
        <header className="p-3 flex justify-between items-center border-b border-light-border dark:border-krypton-gray-700/50 bg-gradient-to-r from-krypton-gray-700/30 to-transparent">
          <h2 className="text-xl font-bold font-mono">
            BLOCK <span className="text-krypton-accent">#{block.index}</span>
          </h2>
          <span className="text-xs text-light-text-secondary dark:text-krypton-gray-400 font-mono">{new Date(block.timestamp).toISOString()}</span>
        </header>
        <div className="p-4 space-y-4">
          {/* FIX: Use the searchTerm prop to determine if a specific hash should be highlighted. */}
          <HashDisplay label="Hash" hash={block.hash} isHighlighted={isHighlighted && block.hash.toLowerCase().includes(searchTerm.toLowerCase())} />
          {/* FIX: Use the searchTerm prop to determine if a specific hash should be highlighted. */}
          <HashDisplay label="Previous Hash" hash={block.previousHash} isHighlighted={isHighlighted && block.previousHash.toLowerCase().includes(searchTerm.toLowerCase())} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-1">
                <p className="text-xs font-bold text-light-text-secondary dark:text-krypton-gray-400 mb-1 uppercase tracking-wider">Nonce</p>
                <p className="font-mono text-krypton-success bg-gray-100 dark:bg-krypton-gray-900/50 p-2 rounded-md">{block.nonce}</p>
             </div>
             <div className="md:col-span-2">
                <p className="text-xs font-bold text-light-text-secondary dark:text-krypton-gray-400 mb-1 uppercase tracking-wider">Transactions ({block.transactions.length})</p>
                {block.transactions.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 bg-gray-100 dark:bg-krypton-gray-900/50 p-2 rounded-md">
                        {block.transactions.map(tx => <TransactionCard key={tx.id} tx={tx}/>)}
                    </div>
                ) : (
                    <div className="p-2 rounded-md bg-gray-100 dark:bg-krypton-gray-900/50 text-center text-sm text-light-text-secondary dark:text-krypton-gray-500 h-full flex items-center justify-center">
                        {block.index === 0 ? 'Genesis Block - No Transactions' : 'No Transactions'}
                    </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
