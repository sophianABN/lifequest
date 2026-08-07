/**
 * Client Mistral — écrit avec `fetch`, sans SDK.
 *
 * L'API de Mistral est compatible OpenAI : un seul point d'entrée
 * (`/v1/chat/completions`) couvre la conversation en flux et la génération
 * structurée. Éviter un SDK supplémentaire garde le bundle serveur léger et
 * évite d'aligner une nouvelle dépendance sur React 19 / Next 16.
 *
 * Invariant du projet : toute erreur (réseau, quota, JSON invalide) doit
 * remonter proprement pour laisser les routes basculer sur les générateurs
 * déterministes de `lib/ai/generators`.
 */

const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

export interface MistralMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CallOptions {
  apiKey: string;
  model: string;
  messages: MistralMessage[];
  maxTokens?: number;
  /** Schéma JSON imposé à la réponse (mode strict). */
  jsonSchema?: { name: string; schema: unknown };
  signal?: AbortSignal;
}

function buildBody({ model, messages, maxTokens, jsonSchema }: CallOptions, stream: boolean) {
  return JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens ?? 4096,
    // Les réponses de l'assistant sont factuelles et courtes : une température
    // basse évite les digressions et rend les étapes générées reproductibles.
    temperature: 0.3,
    stream,
    ...(jsonSchema
      ? {
          response_format: {
            type: "json_schema",
            json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true },
          },
        }
      : {}),
  });
}

async function post(options: CallOptions, stream: boolean) {
  const response = await fetch(MISTRAL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      Accept: stream ? "text/event-stream" : "application/json",
    },
    body: buildBody(options, stream),
    signal: options.signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Mistral ${response.status} : ${detail.slice(0, 300)}`);
  }
  return response;
}

/**
 * Conversation en flux : produit les fragments de texte au fil de l'eau.
 *
 * Le format est du SSE (`data: {...}` séparés par une ligne vide, terminés par
 * `data: [DONE]`). On accumule dans un tampon car un chunk réseau peut couper
 * un événement en plein milieu.
 */
export async function* streamMistral(options: CallOptions): AsyncGenerator<string> {
  const response = await post(options, true);
  if (!response.body) throw new Error("Mistral : réponse sans corps");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let cut = buffer.indexOf("\n");
    while (cut !== -1) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      cut = buffer.indexOf("\n");

      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const event = JSON.parse(payload) as {
          choices?: { delta?: { content?: string | null } }[];
        };
        const chunk = event.choices?.[0]?.delta?.content;
        if (chunk) yield chunk;
      } catch {
        // Fragment SSE non exploitable : on l'ignore plutôt que d'interrompre.
      }
    }
  }
}

/** Appel non-streamé : renvoie le texte brut de la réponse (`""` si vide). */
export async function completeMistral(options: CallOptions): Promise<string> {
  const response = await post(options, false);
  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}
