import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string(),
});

const DISALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
]);

function isDisallowedHost(hostname: string) {
  if (DISALLOWED_HOSTS.has(hostname)) {
    return true;
  }

  // Block private network ranges (simple check)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    const parts = hostname.split(".").map((part) => Number(part));
    if (parts.length === 4) {
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
    }
  }

  return false;
}

async function probeUrl(target: string) {
  try {
    const headResponse = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
    });

    if (headResponse.ok) {
      return {
        ok: true,
        status: headResponse.status,
        finalUrl: headResponse.url,
      } as const;
    }

    if (headResponse.status !== 405 && headResponse.status !== 501) {
      return {
        ok: false,
        status: headResponse.status,
        error: `HEAD request failed with status ${headResponse.status}`,
      } as const;
    }
  } catch (error) {
    // swallow and try GET below
    return probeWithGet(target, error instanceof Error ? error.message : "HEAD request failed");
  }

  return probeWithGet(target, "HEAD request not supported");
}

async function probeWithGet(target: string, reason?: string) {
  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    if (response.body) {
      try {
        await response.body.cancel();
      } catch {
        // ignore
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `GET request failed with status ${response.status}`,
      } as const;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/(text|json|html)/i.test(contentType)) {
      return {
        ok: false,
        status: response.status,
        error: `Unexpected content type: ${contentType}`,
      } as const;
    }

    return {
      ok: true,
      status: response.status,
      finalUrl: response.url,
      note: reason,
    } as const;
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { url } = requestSchema.parse(json);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json(
        { valid: false, error: "Invalid URL." },
        { status: 400 },
      );
    }

    if (!/https?:/.test(parsed.protocol)) {
      return NextResponse.json(
        { valid: false, error: "Only HTTP(S) URLs are permitted." },
        { status: 400 },
      );
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { valid: false, error: "Please provide an HTTPS link." },
        { status: 400 },
      );
    }

    if (isDisallowedHost(parsed.hostname)) {
      return NextResponse.json(
        { valid: false, error: "Links to private or localhost addresses are not allowed." },
        { status: 400 },
      );
    }

    const probeResult = await probeUrl(parsed.toString());

    if (!probeResult.ok) {
      return NextResponse.json(
        {
          valid: false,
          error: probeResult.error ?? "Unable to reach the URL.",
          status: probeResult.status,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      status: probeResult.status,
      finalUrl: probeResult.finalUrl,
      note: 'note' in probeResult ? probeResult.note : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : "Unexpected error validating URL.",
      },
      { status: 500 },
    );
  }
}
