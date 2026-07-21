import {
  adminClient,
  corsHeaders,
  errorResponse,
  jsonResponse,
  userClient,
} from '../_shared/client.ts';
import {
  decryptDassScores,
  kekFromBase64,
} from '../_shared/dassEncryption.ts';
import {
  canReadDassEntry,
  getNextEligibleAt,
  parseHistoryDassBody,
} from '../_shared/dassMonitoring.ts';

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

    const { coupleId } = parseHistoryDassBody(await req.json());
    const admin = adminClient();
    const { data: members, error: memberError } = await admin
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', coupleId);
    const memberIds = (members ?? []).map((member) => member.user_id);

    if (
      memberError ||
      memberIds.length < 1 ||
      memberIds.length > 2 ||
      !memberIds.includes(user.id)
    ) {
      return errorResponse(
        'Mental Monitoring is available only in your partner space',
        403,
      );
    }

    const { data: rows, error: rowsError } = await admin
      .from('dass_monitoring_entries')
      .select(
        'id, couple_id, submitted_by, ciphertext, ciphertext_iv, wrapped_data_key, wrapped_data_key_iv, key_version, created_at',
      )
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true });
    if (rowsError) return errorResponse('Could not load DASS-21 monitoring history', 500);

    const entries = await Promise.all(
      (rows ?? []).map(async (row) => {
        if (
          !canReadDassEntry({
            callerId: user.id,
            submittedBy: row.submitted_by,
            memberIds,
          })
        ) {
          throw new Error('Not authorized');
        }

        const { data: kekBase64, error: kekError } = await admin.rpc(
          'dass_monitoring_get_kek',
          { p_key_version: row.key_version },
        );
        if (kekError || typeof kekBase64 !== 'string') {
          throw new Error('DASS-21 monitoring history is unavailable');
        }

        const scores = await decryptDassScores(
          {
            ciphertext: row.ciphertext,
            ciphertextIv: row.ciphertext_iv,
            wrappedDataKey: row.wrapped_data_key,
            wrappedDataKeyIv: row.wrapped_data_key_iv,
          },
          kekFromBase64(kekBase64),
          {
            recordId: row.id,
            coupleId: row.couple_id,
            submittedBy: row.submitted_by,
            keyVersion: row.key_version,
          },
        );

        return {
          id: row.id,
          submittedBy: row.submitted_by,
          createdAt: row.created_at,
          ...scores,
        };
      }),
    );

    const latestMine = entries.filter((entry) => entry.submittedBy === user.id).at(-1);
    return jsonResponse({
      entries,
      nextEligibleAt: latestMine
        ? getNextEligibleAt(latestMine.createdAt).toISOString()
        : null,
    });
  } catch {
    return errorResponse('DASS-21 monitoring history is unavailable', 500);
  }
});
