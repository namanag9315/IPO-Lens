export async function safeRows<T>(query: PromiseLike<{ data: unknown; error: unknown }>, fallback: T[] = []) {
  try {
    const { data, error } = await query;
    if (error) return fallback;
    return (data ?? fallback) as T[];
  } catch {
    return fallback;
  }
}

export async function safeSingle<T>(query: PromiseLike<{ data: unknown; error: unknown }>, fallback: T | null = null) {
  try {
    const { data, error } = await query;
    if (error) return fallback;
    return (data ?? fallback) as T | null;
  } catch {
    return fallback;
  }
}

export async function safeCount(query: PromiseLike<{ count: number | null; error: unknown }>, fallback = 0) {
  try {
    const { count, error } = await query;
    if (error) return fallback;
    return count ?? fallback;
  } catch {
    return fallback;
  }
}
