import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://devbugrakurnaz_db_user:Bugra.0601@web3.6ev8mrh.mongodb.net/argus?retryWrites=true&w=majority&ssl=true&tls=true';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('argus');
    
    // ==========================================
    // 1. VERIFIED CONTRACTS
    // ==========================================
    console.log('📜 Seeding verified_contracts...');
    
    const verifiedContracts = [
      {
        contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        contractName: 'Argus Test Contract',
        network: 'testnet',
        wasmHash: '57fd076e45f76c1b2ca7d7324271d1d36db621f4dd270e95e66327fdf7323704',
        wasmSize: 552,
        sourceHash: '3216c71b3616d7149a58fc6d...',
        githubRepo: 'https://github.com/suarksoft/argus',
        verifiedAt: new Date(),
        verifiedBy: 'GA2ZDX3GMACMNLCTLPVWPYV2W4PXNWGL654VYSQREYVX6JAJGOGM6SNY',
        verificationCode: 'VRF-5EBNC3',
        status: 'verified',
        checks: {
          wasmMatch: true,
          publicSource: true,
          sourceFiles: true,
          buildEnv: true,
          wasmSize: true,
        },
        metadata: {
          rustVersion: 'rustc 1.87.0',
          sorobanVersion: 'stellar 22.8.1',
          gitCommit: '81869b03',
          gitBranch: 'main',
        },
      },
      {
        contractId: 'CAM5VWPFLWCQIKWFZYD4Y4RFMY6T24GCO4F4A4QRBDREUEPS4VTXRQMP',
        contractName: 'Counter Contract',
        network: 'testnet',
        wasmHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
        wasmSize: 1024,
        sourceHash: 'abcdef123456...',
        githubRepo: 'https://github.com/suarksoft/argus',
        verifiedAt: new Date(Date.now() - 86400000), // 1 day ago
        verifiedBy: 'GAELIPRPRLJFET6FWVU4KN3R32Z7WH3KCHPTVIJOIYLYIWFUWT2NXJFE',
        verificationCode: 'VRF-ABC123',
        status: 'verified',
        checks: {
          wasmMatch: true,
          publicSource: true,
          sourceFiles: true,
          buildEnv: true,
          wasmSize: true,
        },
        metadata: {
          rustVersion: 'rustc 1.87.0',
          sorobanVersion: 'stellar 22.8.1',
          gitCommit: 'abc12345',
          gitBranch: 'main',
        },
      },
      {
        contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
        contractName: 'Stellar AMM DEX',
        network: 'mainnet',
        wasmHash: 'def456789abc...',
        wasmSize: 4096,
        sourceHash: 'xyz789...',
        githubRepo: 'https://github.com/stellar/amm-dex',
        verifiedAt: new Date(Date.now() - 172800000), // 2 days ago
        verifiedBy: 'GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5YLEX',
        verificationCode: 'VRF-DEX001',
        status: 'verified',
        checks: {
          wasmMatch: true,
          publicSource: true,
          sourceFiles: true,
          buildEnv: true,
          wasmSize: true,
        },
        metadata: {
          rustVersion: 'rustc 1.86.0',
          sorobanVersion: 'stellar 22.7.0',
          gitCommit: 'def78901',
          gitBranch: 'main',
        },
      },
    ];
    
    await db.collection('verified_contracts').deleteMany({});
    await db.collection('verified_contracts').insertMany(verifiedContracts);
    console.log(`  ✓ Inserted ${verifiedContracts.length} verified contracts\n`);
    
    // ==========================================
    // 2. DAPPS
    // ==========================================
    console.log('🚀 Seeding dapps...');
    
    const dapps = [
      {
        name: 'StellarSwap',
        slug: 'stellarswap',
        description: 'Decentralized exchange for Stellar assets with automated market making',
        longDescription: 'StellarSwap is a fully decentralized exchange built on Stellar. It enables users to swap assets instantly with minimal fees using an automated market maker (AMM) model. Features include liquidity pools, yield farming, and cross-asset swaps.',
        category: 'DeFi',
        contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        network: 'testnet',
        website: 'https://stellarswap.example.com',
        github: 'https://github.com/suarksoft/argus',
        twitter: 'https://twitter.com/stellarswap',
        logo: '/images/dapps/stellarswap.png',
        verified: true,
        featured: true,
        status: 'active',
        createdAt: new Date(Date.now() - 604800000), // 7 days ago
        updatedAt: new Date(),
        stats: {
          totalVolume: 1250000,
          dailyVolume: 45000,
          totalUsers: 3200,
          totalTransactions: 15600,
        },
        tags: ['DEX', 'AMM', 'Swap', 'Liquidity'],
      },
      {
        name: 'Stellar NFT Marketplace',
        slug: 'stellar-nft',
        description: 'Buy, sell and mint NFTs on the Stellar network',
        longDescription: 'The first NFT marketplace built natively on Stellar. Create, buy, and sell unique digital assets with near-zero transaction fees. Supports collections, auctions, and direct sales.',
        category: 'NFT',
        contractId: 'CAM5VWPFLWCQIKWFZYD4Y4RFMY6T24GCO4F4A4QRBDREUEPS4VTXRQMP',
        network: 'testnet',
        website: 'https://stellarnft.example.com',
        github: 'https://github.com/stellar/nft-marketplace',
        logo: '/images/dapps/stellarnft.png',
        verified: true,
        featured: true,
        status: 'active',
        createdAt: new Date(Date.now() - 1209600000), // 14 days ago
        updatedAt: new Date(),
        stats: {
          totalVolume: 500000,
          dailyVolume: 12000,
          totalUsers: 1800,
          totalTransactions: 8900,
        },
        tags: ['NFT', 'Marketplace', 'Art', 'Collectibles'],
      },
      {
        name: 'LumenLend',
        slug: 'lumenlend',
        description: 'Decentralized lending and borrowing protocol',
        longDescription: 'LumenLend allows users to lend their Stellar assets to earn interest or borrow against their collateral. Features include variable interest rates, flash loans, and liquidation protection.',
        category: 'DeFi',
        contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
        network: 'mainnet',
        website: 'https://lumenlend.example.com',
        github: 'https://github.com/lumenlend/protocol',
        twitter: 'https://twitter.com/lumenlend',
        logo: '/images/dapps/lumenlend.png',
        verified: true,
        featured: false,
        status: 'active',
        createdAt: new Date(Date.now() - 2592000000), // 30 days ago
        updatedAt: new Date(),
        stats: {
          totalVolume: 8500000,
          dailyVolume: 125000,
          totalUsers: 5600,
          totalTransactions: 42000,
        },
        tags: ['Lending', 'Borrowing', 'DeFi', 'Yield'],
      },
      {
        name: 'StellarBridge',
        slug: 'stellarbridge',
        description: 'Cross-chain bridge for moving assets between Stellar and other chains',
        longDescription: 'StellarBridge enables seamless asset transfers between Stellar and Ethereum, BSC, and Polygon. Secure, fast, and cost-effective cross-chain transactions.',
        category: 'Infrastructure',
        contractId: 'CBRIDGECONTRACT123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        network: 'testnet',
        website: 'https://stellarbridge.example.com',
        github: 'https://github.com/stellarbridge/contracts',
        logo: '/images/dapps/bridge.png',
        verified: false,
        featured: false,
        status: 'pending',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(),
        stats: {
          totalVolume: 0,
          dailyVolume: 0,
          totalUsers: 0,
          totalTransactions: 0,
        },
        tags: ['Bridge', 'Cross-chain', 'Infrastructure'],
      },
    ];
    
    await db.collection('dapps').deleteMany({});
    await db.collection('dapps').insertMany(dapps);
    console.log(`  ✓ Inserted ${dapps.length} dApps\n`);
    
    // ==========================================
    // 3. COMMUNITY THREATS
    // ==========================================
    console.log('🚨 Seeding community_threats...');
    
    const threats = [
      {
        type: 'scam_address',
        title: 'Fake Stellar Airdrop Scam',
        description: 'This address is sending fake airdrop tokens and asking users to connect their wallets to claim. Multiple victims reported losing funds.',
        address: 'GSCAMADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
        network: 'mainnet',
        severity: 'critical',
        status: 'confirmed',
        reportedBy: 'GA2ZDX3GMACMNLCTLPVWPYV2W4PXNWGL654VYSQREYVX6JAJGOGM6SNY',
        reporterReputation: 85,
        evidence: [
          'https://twitter.com/victim1/status/123456',
          'https://reddit.com/r/stellar/comments/abc123',
        ],
        votes: {
          up: 45,
          down: 2,
        },
        victimCount: 12,
        totalLoss: 25000,
        createdAt: new Date(Date.now() - 259200000), // 3 days ago
        updatedAt: new Date(),
        tags: ['airdrop', 'phishing', 'wallet-drain'],
      },
      {
        type: 'malicious_contract',
        title: 'Honeypot Token Contract',
        description: 'This contract allows users to buy tokens but blocks all sell transactions. Classic honeypot scam.',
        address: 'CHONEYPOT123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        contractId: 'CHONEYPOT123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        network: 'testnet',
        severity: 'high',
        status: 'confirmed',
        reportedBy: 'GAELIPRPRLJFET6FWVU4KN3R32Z7WH3KCHPTVIJOIYLYIWFUWT2NXJFE',
        reporterReputation: 92,
        evidence: [
          'Contract analysis shows transfer function reverts for non-owner',
        ],
        votes: {
          up: 28,
          down: 1,
        },
        victimCount: 5,
        totalLoss: 8500,
        createdAt: new Date(Date.now() - 604800000), // 7 days ago
        updatedAt: new Date(),
        tags: ['honeypot', 'token', 'rugpull'],
      },
      {
        type: 'phishing_domain',
        title: 'Fake StellarTerm Website',
        description: 'Phishing website impersonating StellarTerm. Domain: steIlarterm.com (uses capital I instead of l)',
        domain: 'steIlarterm.com',
        network: 'mainnet',
        severity: 'critical',
        status: 'pending',
        reportedBy: 'GREPORTER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        reporterReputation: 45,
        evidence: [
          'Domain registered 2 days ago',
          'SSL certificate mismatch',
          'Asks for secret key on login',
        ],
        votes: {
          up: 15,
          down: 3,
        },
        victimCount: 0,
        totalLoss: 0,
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        updatedAt: new Date(),
        tags: ['phishing', 'impersonation', 'stellarterm'],
      },
      {
        type: 'rugpull',
        title: 'MoonStellar Token Rugpull',
        description: 'Project team dumped all tokens and deleted social media accounts. Liquidity removed from DEX.',
        address: 'GMOONSTELLAR123456789ABCDEFGHIJKLMNOPQRSTUVWX12',
        network: 'mainnet',
        severity: 'high',
        status: 'confirmed',
        reportedBy: 'GA2ZDX3GMACMNLCTLPVWPYV2W4PXNWGL654VYSQREYVX6JAJGOGM6SNY',
        reporterReputation: 85,
        evidence: [
          'Liquidity removal TX: abc123...',
          'Team wallet sold 100M tokens',
          'Twitter account deleted',
        ],
        votes: {
          up: 67,
          down: 0,
        },
        victimCount: 234,
        totalLoss: 156000,
        createdAt: new Date(Date.now() - 1209600000), // 14 days ago
        updatedAt: new Date(),
        tags: ['rugpull', 'token', 'liquidity'],
      },
    ];
    
    await db.collection('community_threats').deleteMany({});
    await db.collection('community_threats').insertMany(threats);
    console.log(`  ✓ Inserted ${threats.length} community threats\n`);
    
    // ==========================================
    // 4. KNOWN SCAM ADDRESSES
    // ==========================================
    console.log('⚠️ Seeding scam_addresses...');
    
    const scamAddresses = [
      {
        address: 'GSCAMADDRESS123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
        network: 'mainnet',
        type: 'scam',
        reason: 'Fake airdrop scam - multiple confirmed victims',
        reportCount: 45,
        confirmedVictims: 12,
        totalLoss: 25000,
        firstReported: new Date(Date.now() - 604800000),
        lastActivity: new Date(Date.now() - 86400000),
        status: 'blacklisted',
        labels: ['airdrop-scam', 'phishing'],
      },
      {
        address: 'GMOONSTELLAR123456789ABCDEFGHIJKLMNOPQRSTUVWX12',
        network: 'mainnet',
        type: 'rugpull',
        reason: 'MoonStellar token rugpull - team dumped tokens',
        reportCount: 67,
        confirmedVictims: 234,
        totalLoss: 156000,
        firstReported: new Date(Date.now() - 1209600000),
        lastActivity: new Date(Date.now() - 1209600000),
        status: 'blacklisted',
        labels: ['rugpull', 'exit-scam'],
      },
      {
        address: 'GFAKEEXCHANGE1234567890ABCDEFGHIJKLMNOPQRSTUVW12',
        network: 'mainnet',
        type: 'impersonation',
        reason: 'Impersonating official Stellar exchange support',
        reportCount: 23,
        confirmedVictims: 8,
        totalLoss: 45000,
        firstReported: new Date(Date.now() - 2592000000),
        lastActivity: new Date(Date.now() - 172800000),
        status: 'blacklisted',
        labels: ['impersonation', 'support-scam'],
      },
    ];
    
    await db.collection('scam_addresses').deleteMany({});
    await db.collection('scam_addresses').insertMany(scamAddresses);
    console.log(`  ✓ Inserted ${scamAddresses.length} scam addresses\n`);
    
    // ==========================================
    // 5. VERIFICATION PAYMENTS
    // ==========================================
    console.log('💰 Seeding verification_payments...');
    
    const payments = [
      {
        contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        network: 'testnet',
        payerAddress: 'GA2ZDX3GMACMNLCTLPVWPYV2W4PXNWGL654VYSQREYVX6JAJGOGM6SNY',
        txHash: '99c8de38e5faca225d1eaf2c141734e09bd90161c266fc114890f26a3760b868',
        amountXlm: 50,
        githubRepo: 'https://github.com/suarksoft/argus',
        status: 'paid',
        createdAt: new Date(),
      },
      {
        contractId: 'CAM5VWPFLWCQIKWFZYD4Y4RFMY6T24GCO4F4A4QRBDREUEPS4VTXRQMP',
        network: 'testnet',
        payerAddress: 'GAELIPRPRLJFET6FWVU4KN3R32Z7WH3KCHPTVIJOIYLYIWFUWT2NXJFE',
        txHash: 'abc123def456...',
        amountXlm: 50,
        githubRepo: 'https://github.com/suarksoft/argus',
        status: 'paid',
        createdAt: new Date(Date.now() - 86400000),
      },
    ];
    
    await db.collection('verification_payments').deleteMany({});
    await db.collection('verification_payments').insertMany(payments);
    console.log(`  ✓ Inserted ${payments.length} verification payments\n`);
    
    // ==========================================
    // 6. VERIFICATION REQUESTS
    // ==========================================
    console.log('📋 Seeding verification_requests...');
    
    const requests = [
      {
        code: 'VRF-5EBNC3',
        contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        network: 'testnet',
        githubRepo: 'https://github.com/suarksoft/argus',
        payerAddress: 'GA2ZDX3GMACMNLCTLPVWPYV2W4PXNWGL654VYSQREYVX6JAJGOGM6SNY',
        paymentTxHash: '99c8de38e5faca225d1eaf2c141734e09bd90161c266fc114890f26a3760b868',
        status: 'VERIFIED',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        verifiedAt: new Date(),
      },
      {
        code: 'VRF-ABC123',
        contractId: 'CAM5VWPFLWCQIKWFZYD4Y4RFMY6T24GCO4F4A4QRBDREUEPS4VTXRQMP',
        network: 'testnet',
        githubRepo: 'https://github.com/suarksoft/argus',
        payerAddress: 'GAELIPRPRLJFET6FWVU4KN3R32Z7WH3KCHPTVIJOIYLYIWFUWT2NXJFE',
        paymentTxHash: 'abc123def456...',
        status: 'VERIFIED',
        createdAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 86400000),
        verifiedAt: new Date(Date.now() - 86400000),
      },
      {
        code: 'VRF-PEND01',
        contractId: 'CPENDING12345678901234567890123456789012345678901234',
        network: 'testnet',
        githubRepo: 'https://github.com/example/pending-contract',
        payerAddress: 'GPENDINGADDRESS12345678901234567890123456789012345',
        paymentTxHash: 'pending123...',
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    ];
    
    await db.collection('verification_requests').deleteMany({});
    await db.collection('verification_requests').insertMany(requests);
    console.log(`  ✓ Inserted ${requests.length} verification requests\n`);
    
    // ==========================================
    // 7. COMMUNITY LEADERBOARD
    // ==========================================
    console.log('🏆 Seeding community_leaderboard...');
    
    const leaderboard = [
      {
        address: 'GA2ZDX3GMACMNLCTLPVWPYV2W4PXNWGL654VYSQREYVX6JAJGOGM6SNY',
        username: 'StellarGuardian',
        reputation: 850,
        reportsSubmitted: 45,
        reportsConfirmed: 38,
        victimsHelped: 156,
        totalLossPrevented: 125000,
        rank: 1,
        badges: ['top-reporter', 'whale-catcher', 'community-hero'],
        joinedAt: new Date(Date.now() - 7776000000), // 90 days ago
        lastActive: new Date(),
      },
      {
        address: 'GAELIPRPRLJFET6FWVU4KN3R32Z7WH3KCHPTVIJOIYLYIWFUWT2NXJFE',
        username: 'CryptoWatchdog',
        reputation: 720,
        reportsSubmitted: 32,
        reportsConfirmed: 28,
        victimsHelped: 89,
        totalLossPrevented: 78000,
        rank: 2,
        badges: ['verified-reporter', 'scam-hunter'],
        joinedAt: new Date(Date.now() - 5184000000), // 60 days ago
        lastActive: new Date(),
      },
      {
        address: 'GREPORTER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        username: 'PhishingFinder',
        reputation: 450,
        reportsSubmitted: 18,
        reportsConfirmed: 12,
        victimsHelped: 34,
        totalLossPrevented: 23000,
        rank: 3,
        badges: ['phishing-expert'],
        joinedAt: new Date(Date.now() - 2592000000), // 30 days ago
        lastActive: new Date(Date.now() - 86400000),
      },
    ];
    
    await db.collection('community_leaderboard').deleteMany({});
    await db.collection('community_leaderboard').insertMany(leaderboard);
    console.log(`  ✓ Inserted ${leaderboard.length} leaderboard entries\n`);
    
    // ==========================================
    // CREATE INDEXES
    // ==========================================
    console.log('🔧 Creating indexes...');
    
    // verified_contracts indexes
    await db.collection('verified_contracts').createIndex({ contractId: 1 }, { unique: true });
    await db.collection('verified_contracts').createIndex({ network: 1 });
    await db.collection('verified_contracts').createIndex({ status: 1 });
    
    // dapps indexes
    await db.collection('dapps').createIndex({ slug: 1 }, { unique: true });
    await db.collection('dapps').createIndex({ contractId: 1 });
    await db.collection('dapps').createIndex({ category: 1 });
    await db.collection('dapps').createIndex({ featured: 1 });
    
    // community_threats indexes
    await db.collection('community_threats').createIndex({ address: 1 });
    await db.collection('community_threats').createIndex({ status: 1 });
    await db.collection('community_threats').createIndex({ severity: 1 });
    
    // scam_addresses indexes
    await db.collection('scam_addresses').createIndex({ address: 1 }, { unique: true });
    await db.collection('scam_addresses').createIndex({ status: 1 });
    
    // verification indexes
    await db.collection('verification_payments').createIndex({ contractId: 1, network: 1 });
    await db.collection('verification_requests').createIndex({ code: 1 }, { unique: true });
    await db.collection('verification_requests').createIndex({ contractId: 1 });
    
    // leaderboard indexes
    await db.collection('community_leaderboard').createIndex({ address: 1 }, { unique: true });
    await db.collection('community_leaderboard').createIndex({ rank: 1 });
    await db.collection('community_leaderboard').createIndex({ reputation: -1 });
    
    console.log('  ✓ Indexes created\n');
    
    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('=' .repeat(60));
    console.log('\n✅ Database seeding completed!\n');
    console.log('Collections populated:');
    console.log(`  • verified_contracts: ${verifiedContracts.length} documents`);
    console.log(`  • dapps: ${dapps.length} documents`);
    console.log(`  • community_threats: ${threats.length} documents`);
    console.log(`  • scam_addresses: ${scamAddresses.length} documents`);
    console.log(`  • verification_payments: ${payments.length} documents`);
    console.log(`  • verification_requests: ${requests.length} documents`);
    console.log(`  • community_leaderboard: ${leaderboard.length} documents`);
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed\n');
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('🎉 Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed database:', error);
    process.exit(1);
  });
