'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Editor } from '@/components/editor'
import { supabase, getUserRole, canEdit, type TipTapContent, type UserPlan } from '@/lib/supabase'
import { sampleDocument, emptyDocument } from '@/lib/editor-utils'
import { toast } from 'sonner'
import { useEditLock } from '@/hooks'
import { LockIndicator } from '@/components/ui'

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserPlan | null>(null)
  const [document, setDocument] = useState<TipTapContent | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)

  // Edit lock management
  const {
    hasLock,
    lockOwner,
    lockExpiresAt,
    isLoading: lockLoading,
    acquireLock,
    releaseLock,
    overrideLock,
  } = useEditLock(slug, userRole)

  // Can the user override locks? Only admin/PSM
  const canOverride = userRole?.role === 'admin' || userRole?.role === 'psm'

  // Is the editor actually editable?
  const isEditable = slug === 'demo' || (canEdit(userRole?.role) && hasLock)

  // Check authentication and load document
  useEffect(() => {
    async function init() {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()

        // Demo mode - allow without auth
        if (slug === 'demo') {
          setDocument(sampleDocument)
          setLoading(false)
          return
        }

        if (!user) {
          router.push('/login')
          return
        }

        // Check user's role for this client
        const role = await getUserRole(slug)
        if (!role) {
          setError('You do not have access to this client')
          setLoading(false)
          return
        }

        if (!canEdit(role.role)) {
          setError('You do not have permission to edit this plan')
          setLoading(false)
          return
        }

        setUserRole(role)

        // Load document from database
        const { data: doc, error: docError } = await supabase
          .from('editor_documents')
          .select('*')
          .eq('client_slug', slug)
          .single()

        if (docError && docError.code !== 'PGRST116') {
          // PGRST116 = no rows returned (new document)
          console.error('Error loading document:', docError)
          setError('Failed to load document')
          setLoading(false)
          return
        }

        if (doc) {
          setDocument(doc.content as TipTapContent)
          setDocumentId(doc.id)
        } else {
          // No document exists yet - create empty one
          setDocument(emptyDocument)
        }

        setLoading(false)
      } catch (err) {
        console.error('Initialization error:', err)
        setError('An unexpected error occurred')
        setLoading(false)
      }
    }

    init()
  }, [slug, router])

  // Handle lock acquisition
  const handleAcquireLock = useCallback(async () => {
    const success = await acquireLock()
    if (success) {
      toast.success('You can now edit this plan')
    }
  }, [acquireLock])

  // Handle lock override
  const handleOverrideLock = useCallback(async () => {
    const reason = window.prompt('Enter reason for overriding the lock:')
    if (!reason) return

    const success = await overrideLock(reason)
    if (success) {
      toast.success('Lock overridden - you can now edit')
    }
  }, [overrideLock])

  // Save document
  const handleSave = async (content: TipTapContent) => {
    if (slug === 'demo') {
      // Demo mode - don't actually save
      toast.success('Demo mode: Changes not saved')
      return
    }

    // Check that we have the lock before saving
    if (!hasLock) {
      toast.error('You must acquire the edit lock before saving')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be logged in to save')
      return
    }

    if (documentId) {
      // Update existing document
      const { error } = await supabase
        .from('editor_documents')
        .update({
          content,
          updated_by: user.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)

      if (error) {
        console.error('Save error:', error)
        throw new Error('Failed to save document')
      }

      // Create version
      const { data: latestVersion } = await supabase
        .from('document_versions')
        .select('version_number')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      const nextVersion = (latestVersion?.version_number || 0) + 1

      await supabase
        .from('document_versions')
        .insert({
          document_id: documentId,
          version_number: nextVersion,
          content,
          changed_by: user.email,
        })
    } else {
      // Create new document
      const { data: newDoc, error } = await supabase
        .from('editor_documents')
        .insert({
          client_slug: slug,
          content,
          created_by: user.email,
          updated_by: user.email,
        })
        .select()
        .single()

      if (error) {
        console.error('Create error:', error)
        throw new Error('Failed to create document')
      }

      setDocumentId(newDoc.id)

      // Create initial version
      await supabase
        .from('document_versions')
        .insert({
          document_id: newDoc.id,
          version_number: 1,
          content,
          change_summary: 'Initial version',
          changed_by: user.email,
        })
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy border-t-transparent mx-auto mb-4" />
          <p className="text-muted">Loading editor...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-navy mb-2">
            Access Denied
          </h1>
          <p className="text-muted mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-mid transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-navy text-white">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-mint hover:text-mint-light transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Link>
            <div className="w-px h-6 bg-white/20" />
            <div>
              <h1 className="font-display font-bold">
                {slug === 'demo' ? 'Demo Editor' : slug}
              </h1>
              {slug === 'demo' && (
                <p className="text-xs text-mint/70">Changes won&apos;t be saved</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Lock Indicator - only show for non-demo mode */}
            {slug !== 'demo' && userRole && (
              <LockIndicator
                hasLock={hasLock}
                lockOwner={lockOwner}
                lockExpiresAt={lockExpiresAt}
                isLoading={lockLoading}
                canOverride={canOverride}
                onAcquire={handleAcquireLock}
                onOverride={handleOverrideLock}
              />
            )}

            {userRole && (
              <span className="text-sm text-mint/70">
                {userRole.role}
              </span>
            )}
            <button
              onClick={() => {
                // TODO: Open preview modal
                toast.info('Preview coming soon')
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
            <button
              onClick={() => {
                // TODO: Open version history
                toast.info('Version history coming soon')
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="max-w-4xl mx-auto px-8 py-8">
        {/* Show message if user needs to acquire lock */}
        {slug !== 'demo' && canEdit(userRole?.role) && !hasLock && !lockLoading && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  {lockOwner
                    ? `This plan is being edited by ${lockOwner}. You can view but not edit.`
                    : 'Click "Start Editing" to acquire the edit lock and make changes.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {document && (
          <Editor
            initialContent={document}
            clientSlug={slug}
            readOnly={!isEditable}
            onSave={handleSave}
          />
        )}
      </main>
    </div>
  )
}
