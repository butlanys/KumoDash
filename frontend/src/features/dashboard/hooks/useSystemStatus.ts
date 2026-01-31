import { useQuery } from '@tanstack/react-query'
import { systemService } from '@/services/systemService'
import { SystemStatus } from '../types'
import { useRef, useEffect } from 'react'

interface SpeedData {
  rxSpeed: number
  txSpeed: number
  readSpeed: number
  writeSpeed: number
}

export function useSystemStatus() {
  const previousDataRef = useRef<SystemStatus | null>(null)
  const previousTimeRef = useRef<number>(Date.now())
  
  const query = useQuery({
    queryKey: ['systemStatus'],
    queryFn: systemService.getStatus,
    refetchInterval: 5000,
  })

  // Calculate speeds
  const speeds: SpeedData = {
    rxSpeed: 0,
    txSpeed: 0,
    readSpeed: 0,
    writeSpeed: 0
  }

  if (query.data && previousDataRef.current) {
    const timeDiff = (Date.now() - previousTimeRef.current) / 1000 // seconds
    if (timeDiff > 0) {
      speeds.rxSpeed = Math.max(0, (query.data.network.rx_bytes - previousDataRef.current.network.rx_bytes) / timeDiff)
      speeds.txSpeed = Math.max(0, (query.data.network.tx_bytes - previousDataRef.current.network.tx_bytes) / timeDiff)
      speeds.readSpeed = Math.max(0, (query.data.disk_io.read_bytes - previousDataRef.current.disk_io.read_bytes) / timeDiff)
      speeds.writeSpeed = Math.max(0, (query.data.disk_io.write_bytes - previousDataRef.current.disk_io.write_bytes) / timeDiff)
    }
  }

  // Update refs when data changes
  useEffect(() => {
    if (query.data) {
      previousDataRef.current = query.data
      previousTimeRef.current = Date.now()
    }
  }, [query.data])

  return { ...query, speeds }
}
