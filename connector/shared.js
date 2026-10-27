export const REQUEST_TIMEOUT_MS = 30_000;

export function compactJson(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: { data },
  };
}

export async function fetchWithTimeout(url, init, label) {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error(`${label} did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds.`, {
        cause: error,
      });
    }
    throw error;
  }
}

export async function responseError(response, label, requestPath) {
  const body = (await response.text().catch(() => ""))
    .replace(/\s+/g, " ")
    .trim();
  const detail = body.length > 500 ? `${body.slice(0, 500)}…` : body;
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    return new Error(
      `${label} rate limit reached for ${requestPath}${retryAfter ? `; retry after ${retryAfter} seconds` : ""}.`
    );
  }
  return new Error(
    `${label} error ${response.status} for ${requestPath}${detail ? `: ${detail}` : ""}`
  );
}
