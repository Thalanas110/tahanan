// POST /functions/v1/create-couple  { name: string; type?: 'partner' | 'cof' }
// Creates a couple space owned by the caller, generates a 6-character invite
// code, and adds the caller as its first member.
//
// `type` defaults to 'partner' (the original bf/gf space). Pass 'cof' to
// create a Close/Couple of Friends space. Each user may have at most one
// couple of each type.
//
// All writes use the admin (service-role) client to avoid a circular RLS
// deadlock: inserting into `couples` with .select() requires a SELECT, but
// the couples SELECT policy requires is_couple_member() — impossible for a
// brand-new couple where the creator isn't a member yet.
// Identity is verified up front via the user JWT before any writes happen.
import { adminClient, corsHeaders, errorResponse, jsonResponse, userClient } from '../_shared/client.ts';

const VALID_TYPES = ['partner', 'cof'] as const;
type CoupleType = typeof VALID_TYPES[number];

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
    const type: CoupleType = VALID_TYPES.includes(body.type) ? body.type : 'partner';

    if (!name || typeof name !== 'string') {
      return errorResponse('name is required');
    }

    // 2. Check if the user already has a couple of THIS specific type.
    //    A user may have one 'partner' and one 'cof' couple, but not two of
    //    the same type.
    const { data: existingMembership } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .eq('couple_type', type)
      .maybeSingle();

    if (existingMembership) {
      const label = type === 'cof' ? 'a COF' : 'a couple';
      return errorResponse(`You are already part of ${label} space`, 400);
    }

    // 3. All writes go through the admin client to avoid the RLS catch-22.
    const admin = adminClient();

    // Pick a unique invite code.
    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await admin
        .from('couples')
        .select('id')
        .eq('invite_code', inviteCode)
        .maybeSingle();
      if (!existing) break;
      inviteCode = generateInviteCode();
    }

    // Insert the couple with its type.
    const { data: couple, error: coupleError } = await admin
      .from('couples')
      .insert({ name, invite_code: inviteCode, created_by: user.id, type })
      .select()
      .single();

    if (coupleError) return errorResponse(coupleError.message, 400);

    // Insert the creator as first member, storing the type for fast lookups.
    const { error: memberError } = await admin
      .from('couple_members')
      .insert({ couple_id: couple.id, user_id: user.id, role: 'partner', couple_type: type });

    if (memberError) return errorResponse(memberError.message, 400);

    return jsonResponse({ couple });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
