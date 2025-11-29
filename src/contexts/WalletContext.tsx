"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useWalletConnect } from '@/hooks/useWalletConnect'
import { StellarClient } from '@/lib/stellar/client'

interface WalletContextType {
  walletAddress: string | null
  isConnected: boolean
  balance: number
  loading: boolean
  error: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  // useWalletConnect hook'undan state ve metodları al
  const { 
    wallet, 
    isConnected, 
    isConnecting, 
    error: walletError, 
    connect, 
    disconnect 
  } = useWalletConnect()
  
  const [balance, setBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wallet error'ları local error'a aktar
  useEffect(() => {
    if (walletError) {
      setError(walletError)
    }
  }, [walletError])

  // Bakiye çekme fonksiyonu - Stellar Horizon API'den direkt çeker
  const fetchBalance = useCallback(async (address: string, network: 'testnet' | 'mainnet') => {
    setBalanceLoading(true)
    try {
      console.log(`Bakiye çekiliyor: ${address} (${network})`)
      
      const stellarClient = new StellarClient(network === 'testnet')
      const account = await stellarClient.loadAccount(address)
      
      // Native XLM bakiyesini bul
      const xlmBalance = account.balances.find(b => b.asset_type === 'native')
      const balanceAmount = xlmBalance ? parseFloat(xlmBalance.balance) : 0
      
      console.log(` Bakiye: ${balanceAmount} XLM`)
      setBalance(balanceAmount)
    } catch (error: any) {
      console.error("Bakiye çekilemedi:", error)
      
      // Hesap aktivasyon gerektiriyorsa kullanıcıya bildir
      if (error?.isNotFound || error?.message?.includes('not found') || error?.message?.includes('Not Found')) {
        console.warn(" Hesap blockchain'de bulunamadı. Yeni hesaplar aktivasyon gerektirir.")
        console.info(` Friendbot linki: https://friendbot.stellar.org/?addr=${address}`)
        
        // Testnet'te otomatik olarak fon iste
        if (network === 'testnet') {
          console.log(" Friendbot'tan otomatik fon isteniyor...")
          try {
            const response = await fetch(`https://friendbot.stellar.org?addr=${address}`)
            const result = await response.json()
            console.log("Friendbot response:", result)
            
            if (response.ok) {
              console.log(" Friendbot'tan 10,000 XLM alındı! Bakiye yenileniyor...")
              // 3 saniye bekle ve tekrar dene (blockchain'e yazılması için zaman ver)
              setTimeout(() => {
                console.log(" Bakiye yeniden kontrol ediliyor...")
                fetchBalance(address, network)
              }, 3000)
              return
            } else {
              console.error(" Friendbot hatası:", result)
            }
          } catch (friendbotError) {
            console.error(" Friendbot fetch hatası:", friendbotError)
          }
        }
      }
      
      setBalance(0)
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  // Cüzdan bağlandığında bakiyeyi çek
  useEffect(() => {
    if (isConnected && wallet?.publicKey && wallet?.network) {
      fetchBalance(wallet.publicKey, wallet.network)
    } else {
      setBalance(0)
    }
  }, [isConnected, wallet?.publicKey, wallet?.network, fetchBalance])

  // Cüzdan bağlama fonksiyonu
  const connectWallet = async () => {
    setError(null)
    try {
      // Freighter'a bağlan
      await connect('freighter')
    } catch (err) {
      console.error("Cüzdan bağlantı hatası:", err)
      const message = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu."
      setError(message)
      throw err
    }
  }

  // Cüzdan bağlantısını kes
  const disconnectWallet = () => {
    disconnect()
    setBalance(0)
    setError(null)
  }

  // Bakiyeyi yenile
  const refreshBalance = async () => {
    if (wallet?.publicKey && wallet?.network) {
      await fetchBalance(wallet.publicKey, wallet.network)
    }
  }

  const value = {
    walletAddress: wallet?.publicKey || null,
    isConnected,
    balance,
    loading: isConnecting || balanceLoading,
    error,
    connectWallet,
    disconnectWallet,
    refreshBalance
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
