import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables (set in Netlify or .env.local)
// Use fallback values during build time to allow static analysis
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Browser client (uses anon key, respects RLS)
// Note: The client will fail at runtime if proper env vars aren't set,
// but this allows the build to complete successfully
let _supabase: SupabaseClient | null = null

export const supabase = (() => {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return _supabase
})()

// Types for our database tables
export interface EditorDocument {
  id: string
  client_slug: string
  content: TipTapContent
  status: 'draft' | 'published' | 'archived'
  published_content: TipTapContent | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  content: TipTapContent
  change_summary: string | null
  changed_by: string
  created_at: string
}

export interface EditLock {
  client_slug: string
  locked_by: string
  locked_by_role: 'admin' | 'psm' | 'coach'
  acquired_at: string
  expires_at: string
  last_heartbeat: string
}

export interface Asset {
  id: string
  storage_path: string
  filename: string
  mime_type: string
  file_size: number
  width: number | null
  height: number | null
  tags: string[]
  category: string | null
  client_slug: string | null
  ai_generated: boolean
  ai_prompt: string | null
  uploaded_by: string
  created_at: string
}

export interface UserPlan {
  id: string
  email: string
  role: 'admin' | 'psm' | 'coach' | 'client'
  client_slug: string
  active: boolean
}

// TipTap JSON content structure
export interface TipTapContent {
  type: 'doc'
  content: TipTapNode[]
}

export interface TipTapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  text?: string
  marks?: TipTapMark[]
}

export interface TipTapMark {
  type: string
  attrs?: Record<string, unknown>
}

// Helper to get current user's role for a client
export async function getUserRole(clientSlug: string): Promise<UserPlan | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check for wildcard access first (admin/psm)
  const { data: wildcardAccess } = await supabase
    .from('user_plans')
    .select('*')
    .eq('email', user.email)
    .eq('client_slug', '*')
    .eq('active', true)
    .single()

  if (wildcardAccess && (wildcardAccess.role === 'admin' || wildcardAccess.role === 'psm')) {
    return wildcardAccess
  }

  // Check for specific client access
  const { data: clientAccess } = await supabase
    .from('user_plans')
    .select('*')
    .eq('email', user.email)
    .eq('client_slug', clientSlug)
    .eq('active', true)
    .single()

  return clientAccess
}

// Helper to check if user can edit (admin, psm, or coach)
export function canEdit(role: string | undefined): boolean {
  return role === 'admin' || role === 'psm' || role === 'coach'
}
