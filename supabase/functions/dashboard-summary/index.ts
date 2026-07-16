// GET/POST /functions/v1/dashboard-summary
// Aggregates everything the Home dashboard needs in one round trip: the
// caller's couple, both partners' latest check-ins, today's events, and any
// active emergency. All reads go through the user's own RLS-scoped client.
//
// When a user belongs to both a 'partner' and a 'cof' couple, the primary
// `couple` returned is always the 'partner' one. The 'cof' couple is returned
// separately as `cofCouple`.
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

    // Fetch both couple and cof memberships for the user.
    const [{ data: partnerMembership }, { data: cofMembership }] = await Promise.all([
      supabase
        .from('couple_members')
        .select('couple_id, couples(id, name, invite_code, created_by, created_at)')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('cof_members')
        .select('cof_id, cofs(id, name, invite_code, created_by, created_at)')
        .eq('user_id', user.id)
        .maybeSingle()
    ]);

    if (!partnerMembership && !cofMembership) {
      return jsonResponse({ couple: null, cofCouple: null });
    }

    const primaryCoupleId = partnerMembership?.couple_id ?? cofMembership?.cof_id ?? null;
    const isPrimaryCof = !partnerMembership && !!cofMembership;

    if (!primaryCoupleId) {
      return jsonResponse({ couple: null, cofCouple: null });
    }

    const [{ data: members }, { data: checkins }, { data: events }, { data: activeEmergency }] =
      await Promise.all([
        supabase
          .from(isPrimaryCof ? 'cof_members' : 'couple_members')
          .select('user_id, profiles(id, display_name, avatar_url)')
          .eq(isPrimaryCof ? 'cof_id' : 'couple_id', primaryCoupleId),
        supabase
          .from('daily_checkins')
          .select('*')
          .eq(isPrimaryCof ? 'cof_id' : 'couple_id', primaryCoupleId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('calendar_events')
          .select('*')
          .eq(isPrimaryCof ? 'cof_id' : 'couple_id', primaryCoupleId)
          .gte('start_time', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
          .lt('start_time', new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
          .order('start_time', { ascending: true }),
        supabase
          .from('emergency_events')
          .select('*')
          .eq(isPrimaryCof ? 'cof_id' : 'couple_id', primaryCoupleId)
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
      couple: partnerMembership?.couples ?? null,
      cofCouple: cofMembership?.cofs ?? null,
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
