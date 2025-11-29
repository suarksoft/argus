import { useState, useEffect, useCallback } from 'react';
import { isConnected, requestAccess, getAddress, getNetworkDetails, signTransaction as freighterSign } from '@stellar/freighter-api';

export type WalletType = 'freighter' | 'albedo' | 'rabet';

export interface WalletInfo {
  type: WalletType;
  name: string;
  publicKey: string;
  network: 'testnet' | 'mainnet';
}

export interface WalletConnectState {
  isConnected: boolean;
  wallet: WalletInfo | null;
  isConnecting: boolean;
  error: string | null;
}

const STORAGE_KEY = 'argus_wallet';

export const useWalletConnect = () => {
  const [state, setState] = useState<WalletConnectState>({
    isConnected: false,
    wallet: null,
    isConnecting: false,
    error: null,
  });

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const walletInfo = JSON.parse(stored) as WalletInfo;
        
        // Verify Freighter is still connected
        if (walletInfo.type === 'freighter') {
          const freighterConnected = await isConnected();
          if (freighterConnected) {
            try {
              const addressResult = await getAddress();
              if (addressResult.error) {
                throw new Error(addressResult.error);
              }
              
              const networkInfo = await getNetworkDetails();
              
              setState({
                isConnected: true,
                wallet: {
                  type: 'freighter',
                  name: 'Freighter',
                  publicKey: addressResult.address,
                  network: (networkInfo.network || 'testnet').toLowerCase() as 'testnet' | 'mainnet',
                },
                isConnecting: false,
                error: null,
              });
            } catch (error) {
              console.log('Stored connection invalid:', error);
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }
      } catch (error) {
        console.warn('Error checking existing connection:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    checkExistingConnection();
  }, []);

  const connectFreighter = async (): Promise<WalletInfo> => {
    console.log('Connecting to Freighter...');

    // Check if Freighter is available
    const connectionStatus = await isConnected();
    console.log('Freighter connection status:', connectionStatus);
    
    if (!connectionStatus) {
      throw new Error(
        'Freighter wallet not detected. Please install the extension and grant site access permission.'
      );
    }

    // Request access - triggers permission popup if needed
    const accessResult = await requestAccess();
    console.log('Freighter access result:', accessResult);
    
    if (accessResult.error) {
      throw new Error(accessResult.error);
    }

    const publicKey = accessResult.address;
    
    if (!publicKey) {
      throw new Error('No public key returned. Please select an account in Freighter.');
    }

    // Get network details
    const networkInfo = await getNetworkDetails();
    console.log('Network info:', networkInfo);
    
    const network = networkInfo.network || 'testnet';

    const walletInfo: WalletInfo = {
      type: 'freighter',
      name: 'Freighter',
      publicKey,
      network: network.toLowerCase() as 'testnet' | 'mainnet',
    };

    console.log('Freighter connected successfully:', walletInfo);

    return walletInfo;
  };

  const connect = useCallback(async (walletType: WalletType) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      let walletInfo: WalletInfo;

      if (walletType === 'freighter') {
        walletInfo = await connectFreighter();
      } else {
        throw new Error(`${walletType} not yet supported`);
      }

      setState({
        isConnected: true,
        wallet: walletInfo,
        isConnecting: false,
        error: null,
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(walletInfo));

      return walletInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      wallet: null,
      isConnecting: false,
      error: null,
    });

    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signTransaction = useCallback(async (xdr: string) => {
    if (!state.wallet) {
      throw new Error('No wallet connected');
    }

    if (state.wallet.type === 'freighter') {
      const result = await freighterSign(xdr, {
        networkPassphrase: state.wallet.network === 'testnet' 
          ? 'Test SDF Network ; September 2015' 
          : 'Public Global Stellar Network ; September 2015',
        address: state.wallet.publicKey,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return result.signedTxXdr;
    }

    throw new Error(`Signing not supported for ${state.wallet.type}`);
  }, [state.wallet]);

  const getAvailableWallets = useCallback(async () => {
    const available: { type: WalletType; name: string; installed: boolean; description: string }[] = [];

    // Check Freighter
    try {
      const freighterConnected = await isConnected() as { isConnected: boolean };
      available.push({
        type: 'freighter',
        name: 'Freighter',
        installed: freighterConnected.isConnected,
        description: 'Browser extension wallet for Stellar',
      });
      console.log('Freighter available:', freighterConnected);
    } catch (error) {
      available.push({
        type: 'freighter',
        name: 'Freighter',
        installed: false,
        description: 'Browser extension wallet for Stellar',
      });
      console.log('Freighter check error:', error);
    }

    // Albedo
    available.push({
      type: 'albedo',
      name: 'Albedo',
      installed: false,
      description: 'Web-based wallet',
    });

    // Rabet
    available.push({
      type: 'rabet',
      name: 'Rabet',
      installed: false,
      description: 'Mobile wallet',
    });

    return available;
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
    getAvailableWallets,
  };
};
