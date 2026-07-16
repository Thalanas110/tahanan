// POST /functions/v1/trigger-sos  { message?: string, locationNote?: string }
// User-triggered only -- no background location, no polling. Creates an
// active emergency_events row that the partner's dashboard picks up via
// Supabase Realtime, AND sends an SOS email to the partner via Gmail SMTP.
import { adminClient, corsHeaders, errorResponse, jsonResponse, userClient } from '../_shared/client.ts';
import { sendSosEmail } from '../_shared/mailer.ts';
import { sendFcmMessage } from '../_shared/fcm.ts';

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

    const { message, locationNote, latitude, longitude, roomId, roomType } = await req.json().catch(() => ({}));

    if (!roomId || !roomType) return errorResponse('roomId and roomType are required', 400);

    // --- 1. Verify membership ---
    const { data: membership } = await supabase
      .from(roomType === 'cof' ? 'cof_members' : 'couple_members')
      .select('id')
      .eq('user_id', user.id)
      .eq(roomType === 'cof' ? 'cof_id' : 'couple_id', roomId)
      .maybeSingle();

    if (!membership) return errorResponse(`You are not part of this ${roomType} space`, 400);

    // --- 2. Create the emergency event (in-app alert via Realtime) ---
    const { data: emergency, error } = await supabase
      .from('emergency_events')
      .insert({
        couple_id: roomType === 'partner' ? roomId : null,
        cof_id: roomType === 'cof' ? roomId : null,
        triggered_by: user.id,
        status: 'active',
        message: message ?? null,
        location_note: locationNote ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message, 400);

    // --- 3. Send email & push to partner (non-blocking) ---
    (async () => {
      try {
        const admin = adminClient();

        // Get all members of the room
        const { data: members } = await admin
          .from(roomType === 'cof' ? 'cof_members' : 'couple_members')
          .select('user_id')
          .eq(roomType === 'cof' ? 'cof_id' : 'couple_id', roomId);

        const partnerId = members?.find((m) => m.user_id !== user.id)?.user_id;
        if (!partnerId) return; // solo room, no partner yet

        // Get partner auth record for their email
        const { data: { user: partnerUser } } = await admin.auth.admin.getUserById(partnerId);

        // Get display names and FCM token from profiles
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, display_name, fcm_token')
          .in('id', [user.id, partnerId]);

        const triggerName = profiles?.find((p) => p.id === user.id)?.display_name ?? 'Your partner';
        const partnerProfile = profiles?.find((p) => p.id === partnerId);
        const partnerName = partnerProfile?.display_name ?? 'there';
        const partnerFcmToken = partnerProfile?.fcm_token;

        if (partnerUser?.email) {
          await sendSosEmail({
            partnerEmail: partnerUser.email,
            partnerName,
            triggerName,
            message: message ?? null,
            locationNote: locationNote ?? null,
            triggeredAt: emergency.created_at,
          });
        }

        if (partnerFcmToken) {
            await sendFcmMessage(partnerFcmToken, {
              type: 'sos',
              emergencyId: emergency.id,
              roomId,
              roomType,
              title: 'SOS Alert',
              body: message?.trim()
                ? `${triggerName}: ${message.trim()}`
                : `${triggerName} needs your attention right now.`,
            });
        }
      } catch (err) {
        // Log but never block the response
        console.error('[trigger-sos] Background task failed:', err);
      }
    })();

    return jsonResponse({ emergency });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
