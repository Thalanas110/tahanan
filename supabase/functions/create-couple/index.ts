// POST /functions/v1/create-couple  { name: string }
// Creates a couple space owned by the caller, generates a 6-character invite
// code, and adds the caller as its first member.
import { corsHeaders, errorResponse, jsonResponse, userClient } from '../_shared/client.ts';

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
    const supabase = userClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return errorResponse('Not authenticated', 401);

    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return errorResponse('name is required');
    }

    const { data: existingMembership } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      return errorResponse('You are already part of a couple', 400);
    }

    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase
        .from('couples')
        .select('id')
        .eq('invite_code', inviteCode)
        .maybeSingle();
      if (!existing) break;
      inviteCode = generateInviteCode();
    }

    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .insert({ name, invite_code: inviteCode, created_by: user.id })
      .select()
      .single();

    if (coupleError) return errorResponse(coupleError.message, 400);

    const { error: memberError } = await supabase
      .from('couple_members')
      .insert({ couple_id: couple.id, user_id: user.id, role: 'partner' });

    if (memberError) return errorResponse(memberError.message, 400);

    return jsonResponse({ couple });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
