import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentUserId = claimsData.claims.sub as string
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUserId)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem excluir usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id: targetUserId } = await req.json()

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cannot delete self
    if (targetUserId === currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Você não pode excluir sua própria conta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-delete-user: Deleting user', targetUserId)

    // Delete related data in order (cascade)
    const tables = [
      { table: 'user_entity_links', column: 'user_id' },
      { table: 'module_permissions', column: 'user_id' },
      { table: 'user_roles', column: 'user_id' },
      { table: 'user_funnels', column: 'user_id' },
      { table: 'goals', column: 'created_by' },
    ]

    for (const { table, column } of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, targetUserId)
      
      if (error) {
        console.error(`admin-delete-user: Error deleting from ${table}`, error)
      }
    }

    // Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetUserId)

    // Delete from Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
    
    if (authDeleteError) {
      console.error('admin-delete-user: Error deleting auth user', authDeleteError)
      return new Response(
        JSON.stringify({ error: `Dados removidos, mas erro ao excluir autenticação: ${authDeleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('admin-delete-user: User deleted successfully', targetUserId)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    console.error('admin-delete-user: Unexpected error', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
