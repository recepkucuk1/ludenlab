/* Uzun AI üretim istekleri için SSE-heartbeat yanıtı.

   Neden: Üretim tek blocking POST olarak 60 sn'yi aşabiliyor (BEP prod'da 67 sn
   ölçüldü). Safari (macOS+iOS) hiç bayt akmayan isteği ~60 sn'de koparır →
   "TypeError: Load failed"; Hostinger standalone'da `maxDuration` da işlemez.
   Çözüm: yanıt başlıkları + periyodik ping'ler hemen akmaya başlar, gerçek
   sonuç tek `result` event'i olarak en sonda gelir. İstemci tarafı çözücü:
   `@/lib/fetchGeneration`.

   Kullanım — hızlı ön-kontroller (auth, validasyon, kota) normal JSON dönmeye
   devam etmeli; yalnız yavaş iş (AI çağrısı + commit) buraya sarılır:

     return streamingJson(async () => {
       const out = await slowWork();
       return { status: 200, body: out };
     });

   İş fonksiyonu hata FIRLATMAMALI — hatayı yakalayıp { status, body } dönmeli;
   yine de kaçarsa jenerik 500 gövdesiyle kapatılır. */

export interface StreamedResult {
  status: number;
  body: unknown;
}

const PING_INTERVAL_MS = 15_000;
// Sağlayıcı SDK'ları takılırsa (Anthropic default timeout 10 dk) ping'lerin
// sonsuza dek akmaması için üst sınır.
const HARD_LIMIT_MS = 240_000;

export function streamingJson(work: () => Promise<StreamedResult>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
          );
        } catch {
          closed = true; // istemci koptu — üretim yine tamamlanır, sonuç DB'de
        }
      };

      send({ type: "ping" });
      const pinger = setInterval(
        () => send({ type: "ping" }),
        PING_INTERVAL_MS,
      );

      const timeout = new Promise<StreamedResult>((resolve) =>
        setTimeout(
          () =>
            resolve({
              status: 504,
              body: {
                error: "İşlem zaman aşımına uğradı, lütfen tekrar deneyin.",
              },
            }),
          HARD_LIMIT_MS,
        ),
      );

      Promise.race([work(), timeout])
        .catch((err) => {
          console.error("[streamingJson] iş fonksiyonundan kaçan hata:", err);
          return {
            status: 500,
            body: { error: "Bir hata oluştu" },
          } satisfies StreamedResult;
        })
        .then((r) => {
          send({ type: "result", status: r.status, body: r.body });
          clearInterval(pinger);
          closed = true;
          try {
            controller.close();
          } catch {
            /* zaten kapalı */
          }
        });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // Proxy'ler (LiteSpeed dahil) event-stream'i tamponlamadan geçirsin.
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
