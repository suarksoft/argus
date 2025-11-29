import * as StellarSdk from '@stellar/stellar-sdk';

interface ComprehensiveData {
  account: any;
  transactions: any[];
  payments: any[];
  operations: any[];
  offers: any[];
  trades: any[];
  effects: any[];
  accountAge: number;
  metrics: {
    totalTransactions: number;
    totalPayments: number;
    totalOperations: number;
    incomingPayments: number;
    outgoingPayments: number;
    largestTransaction: number;
    averageTransaction: number;
    lastActivityDate: string;
    activeOfferCount: number;
  };
  security: {
    isMultiSig: boolean;
    signerCount: number;
    hasHomeDomain: boolean;
    flags: any;
    thresholds: any;
  };
  trustlines: any[];
}

export async function collectAllData(
  address: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<ComprehensiveData> {
  console.log('🔍 Collecting ALL data for:', address);

  const server = new StellarSdk.Horizon.Server(
    network === 'testnet'
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org'
  );

  try {
    // 1. ACCOUNT DATA (temel bilgiler)
    console.log('📊 Fetching account data...');
    const account = await server.loadAccount(address);

    // 2. TRANSACTIONS (son 100)
    console.log('📜 Fetching transactions...');
    const transactionsResponse = await server
      .transactions()
      .forAccount(address)
      .order('desc')
      .limit(100)
      .call();
    const transactions = transactionsResponse.records;

    // 3. PAYMENTS (son 100 ödeme)
    console.log('💰 Fetching payments...');
    const paymentsResponse = await server
      .payments()
      .forAccount(address)
      .order('desc')
      .limit(100)
      .call();
    const payments = paymentsResponse.records;

    // 4. OPERATIONS (son 200 işlem)
    console.log('⚙️ Fetching operations...');
    const operationsResponse = await server
      .operations()
      .forAccount(address)
      .order('desc')
      .limit(200)
      .call();
    const operations = operationsResponse.records;

    // 5. OFFERS (aktif teklifler)
    console.log('📈 Fetching offers...');
    const offersResponse = await server
      .offers()
      .forAccount(address)
      .limit(100)
      .call();
    const offers = offersResponse.records;

    // 6. TRADES (son 50 trade)
    console.log('💱 Fetching trades...');
    const tradesResponse = await server
      .trades()
      .forAccount(address)
      .order('desc')
      .limit(50)
      .call();
    const trades = tradesResponse.records;

    // 7. EFFECTS (son 100 etki)
    console.log('✨ Fetching effects...');
    const effectsResponse = await server
      .effects()
      .forAccount(address)
      .order('desc')
      .limit(100)
      .call();
    const effects = effectsResponse.records;

    // 8. HESAP YAŞI (ilk transaction'dan bugüne)
    console.log('📅 Calculating account age...');
    let accountAge = 0;
    let createdAtDate = null;
    
    try {
      // İlk transaction'ı bul (en eski)
      const oldestTxResponse = await server
        .transactions()
        .forAccount(address)
        .order('asc')
        .limit(1)
        .call();
      
      if (oldestTxResponse.records.length > 0) {
        const firstTx = oldestTxResponse.records[0];
        createdAtDate = new Date(firstTx.created_at);
        const now = new Date();
        accountAge = Math.floor((now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log('📅 Account created:', createdAtDate.toISOString());
        console.log('📅 Account age:', accountAge, 'days');
      } else {
        console.log('📅 No transactions found - using account creation time');
        // Transaction yoksa account'un last_modified_time kullan
        if (account.last_modified_time) {
          createdAtDate = new Date(account.last_modified_time);
          const now = new Date();
          accountAge = Math.floor((now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    } catch (err) {
      console.error('Error calculating account age:', err);
      accountAge = 0;
    }
    
    console.log('✅ Final account age:', accountAge, 'days');

    // 9. METRİKLER HESAPLA
    console.log('📊 Calculating metrics...');
    
    // Gelen/giden ödemeleri ayır
    const incomingPayments = payments.filter((p: any) => p.to === address);
    const outgoingPayments = payments.filter((p: any) => p.from === address);
    
    // Toplam tutarları hesapla
    const totalIncoming = incomingPayments.reduce((sum: number, p: any) => {
      return sum + (p.asset_type === 'native' ? parseFloat(p.amount) : 0);
    }, 0);
    
    const totalOutgoing = outgoingPayments.reduce((sum: number, p: any) => {
      return sum + (p.asset_type === 'native' ? parseFloat(p.amount) : 0);
    }, 0);

    // En büyük transaction
    const largestTransaction = payments.reduce((max: number, p: any) => {
      const amount = p.asset_type === 'native' ? parseFloat(p.amount) : 0;
      return amount > max ? amount : max;
    }, 0);

    // Ortalama transaction
    const averageTransaction = payments.length > 0 
      ? (totalIncoming + totalOutgoing) / payments.length 
      : 0;

    // Son aktivite
    const lastActivityDate = transactions.length > 0 
      ? transactions[0].created_at 
      : account.last_modified_time;

    // 10. GÜVENLİK KONTROLÜ
    console.log('🔒 Analyzing security...');
    const isMultiSig = account.signers.length > 1;
    const hasHomeDomain = !!account.home_domain;

    // 11. TRUSTLINES (sahip olunan asset'ler)
    const trustlines = account.balances.filter((b: any) => b.asset_type !== 'native');

    console.log('✅ Data collection complete!');
    console.log('📊 Stats:', {
      transactions: transactions.length,
      payments: payments.length,
      operations: operations.length,
      accountAge,
    });

    return {
      account,
      transactions,
      payments,
      operations,
      offers,
      trades,
      effects,
      accountAge,
      createdAt: createdAtDate?.toISOString() || account.last_modified_time,
      metrics: {
        totalTransactions: transactions.length,
        totalPayments: payments.length,
        totalOperations: operations.length,
        incomingPayments: incomingPayments.length,
        outgoingPayments: outgoingPayments.length,
        largestTransaction,
        averageTransaction,
        lastActivityDate,
        activeOfferCount: offers.length,
      },
      security: {
        isMultiSig,
        signerCount: account.signers.length,
        hasHomeDomain,
        flags: account.flags,
        thresholds: account.thresholds,
      },
      trustlines,
    };
  } catch (error: any) {
    console.error('❌ Data collection error:', error);
    throw error;
  }
}

// Stellar Expert API'den ekstra bilgi
export async function getStellarExpertData(address: string) {
  try {
    const response = await fetch(
      `https://api.stellar.expert/explorer/testnet/account/${address}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      trustScore: data.trust_score || 0,
      isVerified: data.verified || false,
      tags: data.tags || [],
      category: data.category,
      name: data.name,
      description: data.description,
    };
  } catch (error) {
    console.log('Stellar Expert data not available');
    return null;
  }
}

