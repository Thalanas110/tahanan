// POST /functions/v1/join-couple  { code: string }
// Looks up a couple by invite code via the join_couple_by_code
// security-definer RPC (needed because the caller isn't a member yet, so RLS
// alone would hide the couple row) and adds the caller as its second member.
import { corsHeaders, errorResponse, jsonResponse, userClient } from '../_shared/client.ts';

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

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return errorResponse('code is required');
    }

    const { data, error } = await supabase.rpc('join_couple_by_code', {
      code: code.trim().toUpperCase(),
    });

    if (error) {
      const message = error.message.includes('NOT_AUTHENTICATED')
        ? 'Not authenticated'
        : error.message.includes('ALREADY_PAIRED')
          ? 'You are already part of a couple'
          : error.message.includes('INVALID_CODE')
            ? 'That invite code was not found'
            : error.message.includes('COUPLE_FULL')
              ? 'That couple already has two members'
              : error.message;
      return errorResponse(message, 400);
    }

    return jsonResponse({ couple: data?.[0] ?? null });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
