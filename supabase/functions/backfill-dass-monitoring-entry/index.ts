import {
  adminClient,
  corsHeaders,
  errorResponse,
  jsonResponse,
  userClient,
} from '../_shared/client.ts';
import {
  encryptDassScores,
  kekFromBase64,
} from '../_shared/dassEncryption.ts';
import { parseBackfillDassBody } from '../_shared/dassMonitoring.ts';

const KEY_VERSION = 'v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const caller = userClient(req);
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) return errorResponse('Not authenticated', 401);

    const { coupleId, scores, takenAt } = parseBackfillDassBody(await req.json());
    const admin = adminClient();
    const { data: membership, error: membershipError } = await admin
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', coupleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) return errorResponse('Could not verify partner space', 500);
    if (!membership) {
      return errorResponse(
        'Mental Monitoring is available only in your partner space',
        403,
      );
    }

    const recordId = crypto.randomUUID();
    const { data: kekBase64, error: kekError } = await admin.rpc(
      'dass_monitoring_get_kek',
      { p_key_version: KEY_VERSION },
    );
    if (kekError || typeof kekBase64 !== 'string') {
      return errorResponse('Mental Monitoring is temporarily unavailable', 503);
    }

    const encrypted = await encryptDassScores(scores, kekFromBase64(kekBase64), {
      recordId,
      coupleId,
      submittedBy: user.id,
      keyVersion: KEY_VERSION,
    });
    const { data: row, error: insertError } = await admin
      .from('dass_monitoring_entries')
      .insert({
        id: recordId,
        couple_id: coupleId,
        submitted_by: user.id,
        ciphertext: encrypted.ciphertext,
        ciphertext_iv: encrypted.ciphertextIv,
        wrapped_data_key: encrypted.wrappedDataKey,
        wrapped_data_key_iv: encrypted.wrappedDataKeyIv,
        key_version: KEY_VERSION,
        taken_at: takenAt.toISOString(),
      })
      .select('id, submitted_by, taken_at')
      .single();

    if (insertError?.code === '23P01') {
      return errorResponse('DASS-21 scores must be at least seven days apart', 409);
    }
    if (insertError || !row) {
      return errorResponse('Could not save historical DASS-21 monitoring scores', 500);
    }

    return jsonResponse({
      entry: {
        id: row.id,
        submittedBy: row.submitted_by,
        takenAt: row.taken_at,
        ...scores,
      },
    });
  } catch {
    return errorResponse('Could not save historical DASS-21 monitoring scores', 400);
  }
});
