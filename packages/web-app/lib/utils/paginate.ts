export function paginate(
  query: { take?: number; skip?: number; cursor?: { id: string } },
  opts: { defaultTake?: number } = {},
): { take: number; skip?: number; cursor?: { id: string } } {
  const take = Math.min(200, Math.max(1, query.take ?? opts.defaultTake ?? 50));
  const result: { take: number; skip?: number; cursor?: { id: string } } = { take };
  if (query.skip !== undefined) result.skip = query.skip;
  if (query.cursor !== undefined) result.cursor = query.cursor;
  return result;
}
