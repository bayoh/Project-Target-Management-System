import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Create a Supabase client with the service role key
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Verify authorized user (optional: check if the sender is a super_admin)
        // For now, we rely on the implementation plan's security guidance
        const authHeader = req.headers.get('Authorization')!
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Check if the user is a super_admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'super_admin') {
            return new Response(JSON.stringify({ error: 'Only Super Admins can manage users' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { action, email, password, userData, userId, authUpdateData } = await req.json()

        if (action === 'create') {
            // 1. Create the auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: userData.full_name,
                    role: userData.role,
                    status: userData.status
                }
            })

            if (authError) throw authError

            // 2. Create or update the user profile (using upsert to avoid race conditions with triggers)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert([{
                    id: authData.user.id,
                    full_name: userData.full_name,
                    role: userData.role,
                    status: userData.status,
                    updated_at: new Date().toISOString()
                }])

            if (profileError) {
                console.error('Profile creation error:', profileError)
                // If profile creation fails, we might want to know why specifically
                throw new Error(`Profile Error: ${profileError.message}`)
            }

            return new Response(JSON.stringify({ user: authData.user }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else if (action === 'update_auth') {
            const { data, error } = await supabase.auth.admin.updateUserById(userId, authUpdateData);
            if (error) throw error;
            return new Response(JSON.stringify({ data }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else if (action === 'delete') {
            // Prevent users from deleting themselves
            if (userId === user.id) {
                return new Response(JSON.stringify({ error: 'You cannot delete your own account' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Delete the auth user (profile will be deleted automatically via CASCADE)
            const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

            if (deleteError) throw deleteError;

            return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        } else if (action === 'reset_password') {
            // Get user email
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
            if (userError) throw userError;

            // Generate password reset link
            const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
                type: 'recovery',
                email: userData.user.email!,
            });

            if (resetError) throw resetError;

            return new Response(JSON.stringify({
                success: true,
                message: 'Password reset link generated',
                resetLink: resetData.properties.action_link
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        let message = error.message

        // Handle specific error cases
        if (message?.includes('User already registered') || (message?.includes('already exists') && !message.includes('Profile Error'))) {
            message = 'A user with this email address has already been registered'
        } else if (message?.includes('Profile Error')) {
            // Keep the specific profile error message but maybe clean it up
            message = message.replace('Profile Error: ', '')
        }

        return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
