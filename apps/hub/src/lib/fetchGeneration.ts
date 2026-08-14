/* `streamingJson` (SSE-heartbeat) yanıtlarını şeffaf çözen fetch sarmalayıcısı.

   Üretim endpoint'leri hızlı hatalarda (401/403/422…) normal JSON, başarılı
   yavaş yolda ise text/event-stream döner. Bu sarmalayıcı stream'i sonuna kadar
   okur, son `result` event'ini normal bir Response'a çevirir — çağıran kod
   `res.ok` / `res.status` / `res.json()` desenini hiç değiştirmeden kullanır.

   Ping'ler ~15 sn'de bir aktığı için Safari'nin 60 sn sessizlik zaman aşımı
   ("TypeError: Load failed") devreye girmez. */

interface ResultEvent {
  type: "ping" | "result";
  status?: number;
  body?: unknown;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function fetchGeneration(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, init);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !res.body) return res;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: { status: number; body: unknown } | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE event'leri boş satırla ayrılır; son (muhtemelen yarım) parça buffer'da kalır.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const raw of events) {
      const dataLine = raw.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      try {
        const evt = JSON.parse(dataLine.slice(6)) as ResultEvent;
        if (evt.type === "result") {
          final = {
            status: evt.status ?? 500,
            body: evt.body ?? { error: "Bir hata oluştu" },
          };
        }
      } catch {
        /* bozuk parça — yoksay */
      }
    }
  }

  if (!final) {
    // Akış sonuç gelmeden kapandı (deploy/yeniden başlatma vb.).
    return jsonResponse(
      { error: "Bağlantı kesildi, lütfen tekrar deneyin." },
      502,
    );
  }
  return jsonResponse(final.body, final.status);
}
