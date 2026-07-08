// POST /functions/v1/acknowledge-sos  { emergencyId: string }
// Partner acknowledges an active SOS alert.
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

    const { emergencyId } = await req.json();
    if (!emergencyId) return errorResponse('emergencyId is required');

    const { data: emergency, error } = await supabase
      .from('emergency_events')
      .update({
        status: 'acknowledged',
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', emergencyId)
      .select()
      .single();

    if (error) return errorResponse(error.message, 400);

    return jsonResponse({ emergency });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
