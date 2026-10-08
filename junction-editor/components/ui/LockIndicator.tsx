'use client'

import { formatRelativeTime } from '@/lib/editor-utils'

interface LockIndicatorProps {
  hasLock: boolean
  lockOwner: string | null
  lockExpiresAt: Date | null
  isLoading: boolean
  canOverride: boolean
  onAcquire: () => void
  onOverride: () => void
}

export function LockIndicator({
  hasLock,
  lockOwner,
  lockExpiresAt,
  isLoading,
  canOverride,
  onAcquire,
  onOverride,
}: LockIndicatorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-md text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        <span>Checking lock...</span>
      </div>
    )
  }

  if (hasLock) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-mint/20 rounded-md text-sm">
        <svg className="w-4 h-4 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
        <span className="text-mint">
          Editing
          {lockExpiresAt && (
            <span className="text-mint/70 ml-1">
              (expires {formatRelativeTime(lockExpiresAt)})
            </span>
          )}
        </span>
      </div>
    )
  }

  if (lockOwner) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-md text-sm">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-amber-300">
            Locked by {lockOwner}
          </span>
        </div>

        {canOverride && (
          <button
            onClick={onOverride}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm transition-colors"
          >
            Override
          </button>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={onAcquire}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Start Editing
    </button>
  )
}
