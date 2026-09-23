// lib/server/directusErrors.ts
//
// Gedeelde helpers voor de onderwijs-inschrijfroutes
// (/api/onderwijs/inschrijven en /api/onderwijs/volwassenen): een
// technische foutsamenvatting zonder request-data (voor logs) en een
// time-out rond Directus-verzoeken.

/** Technische samenvatting van een SDK/fetch-fout — zonder request-data. */
export function describeError(err: unknown): {
  kind: "unreachable" | "directus" | "timeout" | "unknown";
  detail: string;
} {
  if (err instanceof Error && err.name === "TimeoutError") {
    return { kind: "timeout", detail: err.message };
  }
  const e = err as {
    response?: { status?: number };
    errors?: Array<{ message?: string; extensions?: { code?: string; field?: string; collection?: string } }>;
    message?: string;
    cause?: { code?: string };
  };

  if (Array.isArray(e?.errors) && e.errors.length > 0) {
    const status = e.response?.status;
    const codes = e.errors
      .map((x) => `${x.extensions?.code ?? "?"}${x.extensions?.field ? `(${x.extensions.field})` : ""}`)
      .join(",");
    // Directus-berichten bevatten veld-/collectienamen, geen waarden.
    return { kind: "directus", detail: `status=${status ?? "?"} codes=${codes} msg=${e.errors[0]?.message ?? ""}` };
  }

  // fetch() zonder response: DNS/ECONNREFUSED/timeout op netwerkniveau
  if (e?.response === undefined) {
    return {
      kind: "unreachable",
      detail: `${e?.message ?? "onbekend"}${e?.cause?.code ? ` cause=${e.cause.code}` : ""}`,
    };
  }
  return { kind: "unknown", detail: `status=${e.response?.status ?? "?"} ${e?.message ?? ""}` };
}

export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const t = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Directus-verzoek duurde langer dan ${ms} ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}
