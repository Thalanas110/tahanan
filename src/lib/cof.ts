import type { Cof } from '../types/database';

type RpcError = { message: string } | null;

type RpcSingleResult<T> = Promise<{
  data: T | null;
  error: RpcError;
}>;

export interface CofRpcClient {
  rpc<T>(name: string, args: Record<string, unknown>): {
    single(): PromiseLike<Awaited<RpcSingleResult<T>>>;
  };
}

function mapCofRpcError(message: string): string {
  if (message.includes('NOT_AUTHENTICATED')) {
    return 'Not authenticated';
  }
  if (message.includes('ALREADY_PAIRED')) {
    return 'You are already part of a COF space';
  }
  if (message.includes('INVALID_CODE')) {
    return 'That invite code was not found';
  }
  if (message.includes('COF_FULL')) {
    return 'That COF already has two members';
  }

  return message;
}

async function runCofRpc<T>(
  client: CofRpcClient,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client.rpc<T>(name, args).single();

  if (error) {
    throw new Error(mapCofRpcError(error.message));
  }

  if (!data) {
    throw new Error('No data returned from Supabase');
  }

  return data;
}

export function createCofRoom(client: CofRpcClient, name: string): Promise<Cof> {
  return runCofRpc<Cof>(client, 'create_cof_room', {
    room_name: name.trim(),
  });
}

export function joinCofRoom(
  client: CofRpcClient,
  code: string,
): Promise<{ cof_id: string; cof_name: string }> {
  return runCofRpc<{ cof_id: string; cof_name: string }>(
    client,
    'join_cof_by_code',
    {
      code: code.trim().toUpperCase(),
    },
  );
}
