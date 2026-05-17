import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import NetInfo from '@react-native-community/netinfo'

type NetworkContextValue = {
  isConnected: boolean
}

const NetworkContext = createContext<NetworkContextValue>({ isConnected: true })

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true)
    })
    return () => unsub()
  }, [])

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext)
}
