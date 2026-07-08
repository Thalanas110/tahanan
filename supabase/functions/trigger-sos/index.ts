// POST /functions/v1/trigger-sos  { message?: string, locationNote?: string }
// User-triggered only -- no background location, no polling. Creates an
// active emergency_events row that the partner's dashboard picks up via
// Supabase Realtime.
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

    const { message, locationNote } = await req.json().catch(() => ({}));

    const { data: membership } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) return errorResponse('You are not part of a couple yet', 400);

    const { data: emergency, error } = await supabase
      .from('emergency_events')
      .insert({
        couple_id: membership.couple_id,
        triggered_by: user.id,
        status: 'active',
        message: message ?? null,
        location_note: locationNote ?? null,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message, 400);

    return jsonResponse({ emergency });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
