import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openaiAgent";

const repairRequestSchema = z.object({
  url: z.string(),
  suggestion: z
    .object({
      name: z.string().optional(),
      brand: z.string().optional(),
      category: z.string().optional(),
    })
    .optional(),
  milestoneId: z.string().optional(),
  profile: z
    .object({
      dueDate: z.string().optional(),
      babyGender: z.string().optional(),
      budget: z.string().optional(),
      colorPalette: z.string().optional(),
      materialFocus: z.string().optional(),
      ecoPriority: z.boolean().optional(),
      babyNickname: z.string().optional(),
      hospital: z.string().optional(),
      householdSetup: z.string().optional(),
      careNetwork: z.string().optional(),
      medicalNotes: z.string().optional(),
      birthDate: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
});

const DISALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function isDisallowedHost(hostname: string) {
  if (DISALLOWED_HOSTS.has(hostname)) {
    return true;
  }

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
      return { ok: true, url: headResponse.url } as const;
    }

    if (headResponse.status !== 405 && headResponse.status !== 501) {
      return { ok: false, status: headResponse.status } as const;
    }
  } catch {
    // ignore and fall back to GET
  }

  try {
    const getResponse = await fetch(target, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    if (!getResponse.ok) {
      return { ok: false, status: getResponse.status } as const;
    }

    if (getResponse.body) {
      try {
        await getResponse.body.cancel();
      } catch {
        // ignore
      }
    }

    return { ok: true, url: getResponse.url } as const;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) } as const;
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { url, suggestion, milestoneId, profile } = repairRequestSchema.parse(json);

    let parsedOriginal: URL;
    try {
      parsedOriginal = new URL(url);
    } catch {
      return NextResponse.json({ error: "Original URL was invalid." }, { status: 400 });
    }

    const client = getOpenAIClient();

    const promptParts: string[] = [
      `The link ${parsedOriginal.toString()} returned a 404 when accessed. Provide a working HTTPS product page for the same item.`,
    ];

    if (suggestion?.name) {
      promptParts.push(`Product name: ${suggestion.name}.`);
    }
    if (suggestion?.brand) {
      promptParts.push(`Brand: ${suggestion.brand}.`);
    }
    if (suggestion?.category) {
      promptParts.push(`Category: ${suggestion.category}.`);
    }
    if (milestoneId) {
      promptParts.push(`Milestone: ${milestoneId}.`);
    }
    if (profile) {
      promptParts.push(`Family profile: ${JSON.stringify(profile)}.`);
    }

    promptParts.push(
      "Return JSON with a single key `url` containing the corrected HTTPS link. If you cannot find a reliable link, return {\"url\": null}. Do not invent fake domains.",
    );

    const completion = await client.chat.completions.create({
      model: "gpt-5-chat-latest",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an expert product researcher that finds authoritative vendor or manufacturer URLs." },
        { role: "user", content: promptParts.join(" ") },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "LLM returned no suggestion." }, { status: 500 });
    }

    let parsedSuggestion: { url?: string | null };
    try {
      parsedSuggestion = JSON.parse(content);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to parse LLM response", details: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }

    const candidateUrl = parsedSuggestion.url;
    if (typeof candidateUrl !== "string" || candidateUrl.trim().length === 0) {
      return NextResponse.json({ error: "LLM could not find a better link." }, { status: 422 });
    }

    let parsedCandidate: URL;
    try {
      parsedCandidate = new URL(candidateUrl);
    } catch {
      return NextResponse.json({ error: "LLM returned an invalid URL." }, { status: 422 });
    }

    if (parsedCandidate.protocol !== "https:") {
      return NextResponse.json({ error: "Repaired URL must use HTTPS." }, { status: 422 });
    }

    if (isDisallowedHost(parsedCandidate.hostname)) {
      return NextResponse.json({ error: "Repaired URL pointed to a private or localhost address." }, { status: 422 });
    }

    const probe = await probeUrl(parsedCandidate.toString());
    if (!probe.ok) {
      return NextResponse.json({ error: "Repaired URL still appears invalid." }, { status: 422 });
    }

    return NextResponse.json({ url: probe.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error repairing URL.",
      },
      { status: 500 },
    );
  }
}
