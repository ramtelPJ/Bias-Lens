import "server-only";

const REALTIME_ENDPOINT = "https://realtime.oxylabs.io/v1/queries";

export class OxylabsFetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = "OxylabsFetchError";
  }
}

// ponytail: no JS rendering by default (cheaper); flip render to "html" here
// if a source's homepage/detail pages need JS to produce real content.
export async function fetchHtml(url: string, opts: { render?: "html" } = {}): Promise<string> {
  const username = process.env.OXY_WSA_USERNAME;
  const password = process.env.OXY_WSA_PASSWORD;
  if (!username || !password) throw new Error("Missing OXY_WSA_USERNAME/OXY_WSA_PASSWORD");

  const response = await fetch(REALTIME_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    },
    body: JSON.stringify({
      source: "universal",
      url,
      ...(opts.render ? { render: opts.render } : {}),
    }),
  });

  if (!response.ok) {
    throw new OxylabsFetchError(`Oxylabs request failed with HTTP ${response.status}`, url);
  }

  const payload = (await response.json()) as {
    results?: { content?: string; status_code?: number }[];
  };
  const result = payload.results?.[0];
  if (!result || typeof result.content !== "string") {
    throw new OxylabsFetchError("Oxylabs response had no content", url);
  }
  if (result.status_code && result.status_code >= 400) {
    throw new OxylabsFetchError(`Target page returned HTTP ${result.status_code}`, url);
  }

  return result.content;
}
