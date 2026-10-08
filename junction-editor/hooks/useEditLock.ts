'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type EditLock, type UserPlan } from '@/lib/supabase'
import { toast } from 'sonner'

interface UseEditLockReturn {
  hasLock: boolean
  lockOwner: string | null
  lockExpiresAt: Date | null
  isLoading: boolean
  error: string | null
  acquireLock: () => Promise<boolean>
  releaseLock: () => Promise<void>
  overrideLock: (reason: string) => Promise<boolean>
}

// Lock duration: 30 minutes
const LOCK_DURATION_MS = 30 * 60 * 1000

// Heartbeat interval: 5 minutes
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000

export function useEditLock(
  clientSlug: string,
  userRole: UserPlan | null
): UseEditLockReturn {
  const [hasLock, setHasLock] = useState(false)
  const [lockOwner, setLockOwner] = useState<string | null>(null)
  const [lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const sessionId = useRef<string>(generateSessionId())

  // Generate a unique session ID for this browser tab
  function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  // Check current lock status
  const checkLock = useCallback(async () => {
    if (!userRole) {
      setIsLoading(false)
      return
    }

    try {
      const { data: lock, error: lockError } = await supabase
        .from('edit_locks')
        .select('*')
        .eq('client_slug', clientSlug)
        .single()

      if (lockError && lockError.code !== 'PGRST116') {
        // PGRST116 = no rows (no lock exists)
        console.error('Lock check error:', lockError)
        setError('Failed to check lock status')
        setIsLoading(false)
        return
      }

      if (!lock) {
        // No lock exists
        setHasLock(false)
        setLockOwner(null)
        setLockExpiresAt(null)
      } else {
        const expiresAt = new Date(lock.expires_at)
        const isExpired = expiresAt < new Date()

        if (isExpired) {
          // Lock expired - clean it up
          await supabase
            .from('edit_locks')
            .delete()
            .eq('client_slug', clientSlug)

          setHasLock(false)
          setLockOwner(null)
          setLockExpiresAt(null)
        } else {
          // Lock exists and is valid
          const isOurLock = lock.locked_by === userRole.email && lock.session_id === sessionId.current
          setHasLock(isOurLock)
          setLockOwner(lock.locked_by)
          setLockExpiresAt(expiresAt)
        }
      }

      setIsLoading(false)
    } catch (err) {
      console.error('Lock check error:', err)
      setError('Failed to check lock status')
      setIsLoading(false)
    }
  }, [clientSlug, userRole])

  // Acquire lock
  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!userRole) {
      toast.error('You must be logged in to edit')
      return false
    }

    if (!['admin', 'psm', 'coach'].includes(userRole.role)) {
      toast.error('You do not have permission to edit')
      return false
    }

    try {
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MS)

      // Try to insert a new lock (will fail if one exists)
      const { error: insertError } = await supabase
        .from('edit_locks')
        .insert({
          client_slug: clientSlug,
          locked_by: userRole.email,
          locked_by_role: userRole.role,
          expires_at: expiresAt.toISOString(),
          session_id: sessionId.current,
        })

      if (insertError) {
        // Lock already exists - check if it's ours or expired
        const { data: existingLock } = await supabase
          .from('edit_locks')
          .select('*')
          .eq('client_slug', clientSlug)
          .single()

        if (existingLock) {
          const lockExpires = new Date(existingLock.expires_at)

          if (lockExpires < new Date()) {
            // Lock expired - take it over
            const { error: updateError } = await supabase
              .from('edit_locks')
              .update({
                locked_by: userRole.email,
                locked_by_role: userRole.role,
                acquired_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                last_heartbeat: new Date().toISOString(),
                session_id: sessionId.current,
                override_reason: null,
              })
              .eq('client_slug', clientSlug)

            if (updateError) {
              toast.error('Failed to acquire lock')
              return false
            }
          } else if (existingLock.locked_by === userRole.email) {
            // It's our lock from another session - update it
            const { error: updateError } = await supabase
              .from('edit_locks')
              .update({
                expires_at: expiresAt.toISOString(),
                last_heartbeat: new Date().toISOString(),
                session_id: sessionId.current,
              })
              .eq('client_slug', clientSlug)

            if (updateError) {
              toast.error('Failed to refresh lock')
              return false
            }
          } else {
            // Someone else has the lock
            toast.error(`This plan is being edited by ${existingLock.locked_by}`)
            setLockOwner(existingLock.locked_by)
            setLockExpiresAt(lockExpires)
            return false
          }
        }
      }

      setHasLock(true)
      setLockOwner(userRole.email)
      setLockExpiresAt(expiresAt)
      startHeartbeat()

      return true
    } catch (err) {
      console.error('Acquire lock error:', err)
      toast.error('Failed to acquire edit lock')
      return false
    }
  }, [clientSlug, userRole])

  // Release lock
  const releaseLock = useCallback(async () => {
    if (!userRole || !hasLock) return

    stopHeartbeat()

    try {
      await supabase
        .from('edit_locks')
        .delete()
        .eq('client_slug', clientSlug)
        .eq('locked_by', userRole.email)

      setHasLock(false)
      setLockOwner(null)
      setLockExpiresAt(null)
    } catch (err) {
      console.error('Release lock error:', err)
    }
  }, [clientSlug, userRole, hasLock])

  // Override lock (admin/PSM only)
  const overrideLock = useCallback(async (reason: string): Promise<boolean> => {
    if (!userRole || !['admin', 'psm'].includes(userRole.role)) {
      toast.error('Only admins and PSMs can override locks')
      return false
    }

    try {
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MS)

      const { error: updateError } = await supabase
        .from('edit_locks')
        .update({
          locked_by: userRole.email,
          locked_by_role: userRole.role,
          acquired_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          last_heartbeat: new Date().toISOString(),
          session_id: sessionId.current,
          override_reason: reason,
        })
        .eq('client_slug', clientSlug)

      if (updateError) {
        // Lock might not exist - try to create it
        const { error: insertError } = await supabase
          .from('edit_locks')
          .insert({
            client_slug: clientSlug,
            locked_by: userRole.email,
            locked_by_role: userRole.role,
            expires_at: expiresAt.toISOString(),
            session_id: sessionId.current,
            override_reason: reason,
          })

        if (insertError) {
          toast.error('Failed to override lock')
          return false
        }
      }

      setHasLock(true)
      setLockOwner(userRole.email)
      setLockExpiresAt(expiresAt)
      startHeartbeat()

      toast.success('Lock overridden successfully')
      return true
    } catch (err) {
      console.error('Override lock error:', err)
      toast.error('Failed to override lock')
      return false
    }
  }, [clientSlug, userRole])

  // Heartbeat to keep lock alive
  const sendHeartbeat = useCallback(async () => {
    if (!userRole || !hasLock) return

    try {
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MS)

      await supabase
        .from('edit_locks')
        .update({
          last_heartbeat: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('client_slug', clientSlug)
        .eq('locked_by', userRole.email)
        .eq('session_id', sessionId.current)

      setLockExpiresAt(expiresAt)
    } catch (err) {
      console.error('Heartbeat error:', err)
    }
  }, [clientSlug, userRole, hasLock])

  const startHeartbeat = useCallback(() => {
    stopHeartbeat()
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
  }, [sendHeartbeat])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  // Check lock on mount and when userRole changes
  useEffect(() => {
    checkLock()
  }, [checkLock])

  // Release lock on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat()
      // Note: Can't reliably release lock on unmount in React 18 strict mode
      // The heartbeat expiration handles cleanup
    }
  }, [stopHeartbeat])

  // Release lock when tab/window closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasLock && userRole) {
        // Use sendBeacon for reliable delivery
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/edit_locks?client_slug=eq.${clientSlug}&locked_by=eq.${encodeURIComponent(userRole.email)}`
        navigator.sendBeacon(url, '')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [clientSlug, userRole, hasLock])

  return {
    hasLock,
    lockOwner,
    lockExpiresAt,
    isLoading,
    error,
    acquireLock,
    releaseLock,
    overrideLock,
  }
}
