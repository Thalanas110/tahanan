// POST /functions/v1/create-cof  { name: string }
// Creates a COF space owned by the caller, generates a 6-character invite
// code, and adds the caller as its first member.
//
// All writes use the admin (service-role) client to avoid a circular RLS
// deadlock: inserting into `cofs` with .select() requires a SELECT, but
// the cofs SELECT policy requires is_cof_member() — impossible for a
// brand-new cof where the creator isn't a member yet.
// Identity is verified up front via the user JWT before any writes happen.
import { adminClient, corsHeaders, errorResponse, jsonResponse, userClient } from '../_shared/client.ts';

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify caller identity via their JWT (runs under RLS).
    const supabase = userClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return errorResponse('Not authenticated', 401);

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return errorResponse('name is required');
    }

    // 2. Check if the user already has a COF space.
    const { data: existingMembership } = await supabase
      .from('cof_members')
      .select('cof_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      return errorResponse(`You are already part of a COF space`, 400);
    }

    // 3. All writes go through the admin client to avoid the RLS catch-22.
    const admin = adminClient();

    // Pick a unique invite code.
    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await admin
        .from('cofs')
        .select('id')
        .eq('invite_code', inviteCode)
        .maybeSingle();
      if (!existing) break;
      inviteCode = generateInviteCode();
    }

    // Insert the COF.
    const { data: cof, error: cofError } = await admin
      .from('cofs')
      .insert({ name, invite_code: inviteCode, created_by: user.id })
      .select()
      .single();

    if (cofError) return errorResponse(cofError.message, 400);

    // Insert the creator as first member.
    const { error: memberError } = await admin
      .from('cof_members')
      .insert({ cof_id: cof.id, user_id: user.id, role: 'partner' });

    if (memberError) return errorResponse(memberError.message, 400);

    return jsonResponse({ cof });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
