const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const MAX_BODY_CHARS = 48_000;

let busy = false;
const hits = new Map<string, number[]>();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "local";
  return ip.slice(0, 64);
}

export async function readJson(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    return { ok: false as const, status: 413, error: "提交内容过长，这次没有调用模型。" };
  }
  try {
    return { ok: true as const, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false as const, status: 400, error: "提交内容无法读取。" };
  }
}

export function beginAiCall(request: Request, cost = 1) {
  if (busy) {
    return {
      ok: false as const,
      status: 429,
      error: "已有一次 AI 请求正在进行，请等它结束，避免重复调用。",
    };
  }
  const key = clientKey(request);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length + cost > MAX_PER_WINDOW) {
    const waitMinutes = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 60000));
    return {
      ok: false as const,
      status: 429,
      error: `同一网络一小时内最多 ${MAX_PER_WINDOW} 次模型调用。请约 ${waitMinutes} 分钟后再试。`,
    };
  }
  for (let index = 0; index < cost; index += 1) recent.push(now);
  hits.set(key, recent);
  if (hits.size > 400) {
    for (const [storedKey, times] of hits) {
      const fresh = times.filter((time) => now - time < WINDOW_MS);
      if (fresh.length === 0) hits.delete(storedKey);
    }
  }
  busy = true;
  return { ok: true as const };
}

export function finishAiCall() {
  busy = false;
}
