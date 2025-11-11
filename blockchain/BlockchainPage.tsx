import React, { useState, useEffect, useMemo } from 'react';
import { getSignals } from '../services/firebase';
import type { Block, BlockchainTransaction } from './blockchainTypes';
import { BlockCard } from './BlockCard';
import { LoaderIcon, GitCommitIcon, CpuIcon, CheckCircleIcon } from '../components/icons';

const CHUNK_SIZE = 3; // Number of transactions per block
const MINING_DIFFICULTY = 2; // Number of leading zeros for a valid hash

// Helper function for SHA-256 Hashing
async function calculateHash(data: string): Promise<string> {
  const textAsBuffer = new TextEncoder().encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface BlockchainPageProps {
    // FIX: Make searchTerm optional to allow rendering without this prop, as in blockchain/index.tsx.
    searchTerm?: string;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-light-bg/50 dark:bg-krypton-gray-800/50 border border-light-border dark:border-krypton-gray-700 rounded-lg p-3 flex items-center space-x-3 backdrop-blur-sm">
        <div className="p-2 bg-krypton-blue-500/10 rounded-md">
            {icon}
        </div>
        <div>
            <p className="text-xs font-bold text-light-text-secondary dark:text-krypton-gray-400 uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-light-text-primary dark:text-white">{value}</p>
        </div>
    </div>
);


const BlockchainPage: React.FC<BlockchainPageProps> = ({ searchTerm = '' }) => {
  const [chain, setChain] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Initializing APOLO Chain...');

  useEffect(() => {
    const buildChain = async () => {
      // 1. Create Genesis Block
      setStatusMessage('Creating Genesis Block...');
      const genesisBlock: Omit<Block, 'hash' | 'isMining'> = {
        index: 0,
        timestamp: Date.now(),
        transactions: [],
        nonce: 0,
        previousHash: "0".repeat(64),
      };
      const genesisHash = await calculateHash(
        `${genesisBlock.index}${genesisBlock.previousHash}${genesisBlock.timestamp}${JSON.stringify(genesisBlock.transactions)}${genesisBlock.nonce}`
      );
      const minedGenesisBlock: Block = { ...genesisBlock, hash: genesisHash };
      setChain([minedGenesisBlock]);
      await new Promise(res => setTimeout(res, 300));

      // 2. Fetch all signals
      setStatusMessage('Fetching transaction history from Firestore...');
      const signals = await getSignals();
      const userSignals = signals.filter(s => !s.author.isBot);

      if(userSignals.length === 0) {
        setStatusMessage('No user transactions found to build the chain.');
        setIsLoading(false);
        return;
      }

      // 3. Group signals into chunks for each block
      const transactionChunks: BlockchainTransaction[][] = [];
      for (let i = 0; i < userSignals.length; i += CHUNK_SIZE) {
        transactionChunks.push(userSignals.slice(i, i + CHUNK_SIZE));
      }

      // 4. Mine each block sequentially
      let previousHash = minedGenesisBlock.hash;
      for (let i = 0; i < transactionChunks.length; i++) {
        setStatusMessage(`Processing transactions ${i * CHUNK_SIZE + 1} to ${Math.min((i + 1) * CHUNK_SIZE, userSignals.length)}...`);
        const blockIndex = i + 1;
        const newBlockBase = {
          index: blockIndex,
          timestamp: Date.now(),
          transactions: transactionChunks[i],
          previousHash,
        };
        
        setChain(prev => [...prev, { ...newBlockBase, nonce: 0, hash: '', isMining: true }]);
        
        setStatusMessage(`Mining Block #${blockIndex}... (Difficulty: ${'0'.repeat(MINING_DIFFICULTY)})`);
        let nonce = 0;
        let hash = '';
        while (true) {
          const dataToHash = `${newBlockBase.index}${newBlockBase.previousHash}${newBlockBase.timestamp}${JSON.stringify(newBlockBase.transactions)}${nonce}`;
          hash = await calculateHash(dataToHash);
          if (hash.startsWith('0'.repeat(MINING_DIFFICULTY))) {
            break;
          }
          nonce++;
          if (nonce % 1000 === 0) await new Promise(res => setTimeout(res, 0));
        }

        const minedBlock: Block = { ...newBlockBase, nonce, hash };
        previousHash = hash;
        
        setChain(prev => prev.map(b => b.index === blockIndex ? minedBlock : b));
        await new Promise(res => setTimeout(res, 200));
      }
      
      setStatusMessage('APOLO Chain is up to date.');
      setIsLoading(false);
    };

    buildChain();
  }, []);
  
  const filteredChain = useMemo(() => {
    if (!searchTerm.trim()) {
        return chain;
    }
    const lowercasedSearch = searchTerm.toLowerCase();
    return chain.filter(block => 
        !block.isMining && (
            block.hash.toLowerCase().includes(lowercasedSearch) ||
            block.previousHash.toLowerCase().includes(lowercasedSearch)
        )
    );
  }, [chain, searchTerm]);

  return (
    <div className="animate-fade-in relative -mt-8 -mx-4 p-8 min-h-screen">
       {/* Background Grid */}
      <div className="absolute inset-0 bg-light-bg dark:bg-krypton-gray-900" style={{
        backgroundImage: 'radial-gradient(circle at center, rgba(112, 112, 112, 0.15) 1px, transparent 1px)',
        backgroundSize: '2rem 2rem',
      }}></div>

      <div className="relative z-10">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-wider mb-2 text-transparent bg-clip-text bg-gradient-to-r from-krypton-blue-500 to-krypton-purple">APOLO CHAIN EXPLORER</h1>
            <p className="text-light-text-secondary dark:text-krypton-gray-400">A real-time visual representation of network activity.</p>
        </div>

        <div className="sticky top-20 z-20 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Chain Length" value={chain.length} icon={<GitCommitIcon className="w-6 h-6 text-krypton-blue-500" />}/>
            <StatCard title="Difficulty" value={MINING_DIFFICULTY} icon={<CpuIcon className="w-6 h-6 text-krypton-blue-500" />}/>
            <div className="bg-light-bg/50 dark:bg-krypton-gray-800/50 border border-light-border dark:border-krypton-gray-700 rounded-lg p-3 flex items-center space-x-3 backdrop-blur-sm">
                <div className="p-2">
                    {isLoading ? 
                        <LoaderIcon className="w-6 h-6 animate-spin text-krypton-accent" /> :
                        <CheckCircleIcon className="w-6 h-6 text-krypton-success" />
                    }
                </div>
                <div>
                    <p className="text-xs font-bold text-light-text-secondary dark:text-krypton-gray-400 uppercase tracking-wider">Status</p>
                    <p className={`text-lg font-bold ${isLoading ? 'text-krypton-accent' : 'text-krypton-success'}`}>{statusMessage}</p>
                </div>
            </div>
        </div>

        <div className="relative max-w-4xl mx-auto">
            {chain.length > 1 && <div className="absolute left-10 top-16 bottom-16 w-1 bg-gray-200 dark:bg-krypton-gray-700/50 rounded-full -ml-0.5"></div>}
            
            <div className="space-y-8">
                {filteredChain.slice().reverse().map((block) => (
                    // FIX: Pass the searchTerm prop to BlockCard for highlighting individual hashes.
                    <BlockCard key={block.index} block={block} isHighlighted={!!searchTerm.trim()} searchTerm={searchTerm} />
                ))}
                {searchTerm.trim() && filteredChain.length === 0 && !isLoading && (
                    <div className="text-center py-16 bg-light-card dark:bg-krypton-gray-800/80 rounded-lg">
                        <p className="text-xl font-bold">No Blocks Found</p>
                        <p className="text-light-text-secondary dark:text-krypton-gray-400">Your search for "{searchTerm}" did not match any block hashes.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainPage;
