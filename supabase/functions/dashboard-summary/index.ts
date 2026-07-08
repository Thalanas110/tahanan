// GET/POST /functions/v1/dashboard-summary
// Aggregates everything the Home dashboard needs in one round trip: the
// caller's couple, both partners' latest check-ins, today's events, and any
// active emergency. All reads go through the user's own RLS-scoped client.
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

    const { data: membership } = await supabase
      .from('couple_members')
      .select('couple_id, couples(id, name, invite_code)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return jsonResponse({ couple: null });
    }

    const coupleId = membership.couple_id;

    const [{ data: members }, { data: checkins }, { data: events }, { data: activeEmergency }] =
      await Promise.all([
        supabase
          .from('couple_members')
          .select('user_id, profiles(id, display_name, avatar_url)')
          .eq('couple_id', coupleId),
        supabase
          .from('daily_checkins')
          .select('*')
          .eq('couple_id', coupleId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('couple_id', coupleId)
          .gte('start_time', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
          .lt('start_time', new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
          .order('start_time', { ascending: true }),
        supabase
          .from('emergency_events')
          .select('*')
          .eq('couple_id', coupleId)
          .neq('status', 'resolved')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const latestByUser = new Map<string, unknown>();
    for (const checkin of checkins ?? []) {
      if (!latestByUser.has(checkin.user_id)) {
        latestByUser.set(checkin.user_id, checkin);
      }
    }

    return jsonResponse({
      couple: membership.couples,
      members: members ?? [],
      myLatestCheckin: latestByUser.get(user.id) ?? null,
      partnerLatestCheckin:
        [...latestByUser.entries()].find(([userId]) => userId !== user.id)?.[1] ?? null,
      todaysEvents: events ?? [],
      activeEmergency: activeEmergency ?? null,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
