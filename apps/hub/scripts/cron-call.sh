#!/bin/bash
# LudenLab — cron uçlarını çağıran sarmalayıcı.
#
# NEDEN: hPanel cron girdileri doğrudan `curl ... -H "Authorization: Bearer
# $CRON_SECRET"` çağırıyordu. Cron kabuğunda uygulama env'i YOK, dolayısıyla
# $CRON_SECRET boş genişliyor ve uç 401 döndürüyordu (2026-08-28'de üç görevin
# ikisi bu yüzden aylardır başarısızdı). Ayrıca çıktı hiçbir yere yazılmadığı
# için panelde yalnız son satır görünüyor, geçmiş tutulmuyordu.
#
# Bu script: env'i bulur → çağırır → tarih + HTTP kodu + süre + yanıt gövdesini
# hem log dosyasına hem panele (stdout) yazar → HTTP 2xx değilse non-zero çıkar
# ki Hostinger görevi "başarısız" işaretlesin.
#
# KULLANIM (hPanel → Cron Jobs):
#   0  3 * * *  bash ~/domains/ludenlab.com/<repo>/apps/hub/scripts/cron-call.sh iyzico-sweep
#   0  4 * * *  bash ~/domains/ludenlab.com/<repo>/apps/hub/scripts/cron-call.sh studio-cleanup
#   10 4 * * *  bash ~/domains/ludenlab.com/<repo>/apps/hub/scripts/cron-call.sh atolye-cleanup
#
# AYARLAR (hepsi opsiyonel, env ile):
#   CRON_SECRET     — doğrudan verilirse env dosyası aranmaz
#   CRON_ENV_FILE   — secret'ı içeren .env yolu (ilk sırada denenir)
#   CRON_BASE_URL   — varsayılan https://ludenlab.com
#   CRON_STATE_DIR  — log dizini; varsayılan ~/cron-logs/ludenlab
#                     (bilerek deploy dizininin DIŞINDA: her deploy log'u silmesin)
set -u

JOB="${1:-}"
BASE_URL="${CRON_BASE_URL:-https://ludenlab.com}"
STATE_DIR="${CRON_STATE_DIR:-$HOME/cron-logs/ludenlab}"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STARTED_TS="$(date +%s)"

case "$JOB" in
  iyzico-sweep)   PATH_PART="/api/iyzico/cron/sweep" ;;
  studio-cleanup) PATH_PART="/studio/api/cron/subscription-cleanup" ;;
  atolye-cleanup) PATH_PART="/atolye/api/cron/subscription-cleanup" ;;
  *)
    echo "[cron] $STARTED_AT HATA: bilinmeyen görev '${JOB}'."
    echo "       Geçerli: iyzico-sweep | studio-cleanup | atolye-cleanup"
    exit 2
    ;;
esac

mkdir -p "$STATE_DIR"
LOG="$STATE_DIR/cron.log"

# Log şişmesin: 5000 satırı aşarsa son 2000 satır tutulur.
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG" 2>/dev/null || echo 0)" -gt 5000 ]; then
  tail -2000 "$LOG" > "$LOG.trim" && mv "$LOG.trim" "$LOG"
fi

# ── Secret'ı bul ────────────────────────────────────────────────
# Passenger/Next env'i cron context'inde yok; sırayla aday .env'leri dene.
if [ -z "${CRON_SECRET:-}" ]; then
  for CANDIDATE in \
    "${CRON_ENV_FILE:-}" \
    "$HOME/.env.cron" \
    "$HOME/domains/ludenlab.com/public_html/.builds/config/.env" \
    "$HOME/domains/ludenlab.com/nodejs/.env" \
    "$HOME/domains/ludenlab.com/nodejs/apps/hub/.env"
  do
    [ -n "$CANDIDATE" ] && [ -f "$CANDIDATE" ] || continue
    # Yalnız CRON_SECRET satırını al — tüm env'i source etmeyelim.
    LINE="$(grep -m1 -E '^[[:space:]]*(export[[:space:]]+)?CRON_SECRET=' "$CANDIDATE" 2>/dev/null || true)"
    if [ -n "$LINE" ]; then
      CRON_SECRET="${LINE#*=}"
      CRON_SECRET="${CRON_SECRET%\"}"; CRON_SECRET="${CRON_SECRET#\"}"
      CRON_SECRET="${CRON_SECRET%\'}"; CRON_SECRET="${CRON_SECRET#\'}"
      SECRET_SOURCE="$CANDIDATE"
      break
    fi
  done
else
  SECRET_SOURCE="env"
fi

if [ -z "${CRON_SECRET:-}" ]; then
  MSG="[cron] $STARTED_AT $JOB ABORT: CRON_SECRET bulunamadı (env yok, aday .env dosyalarında da yok)"
  echo "$MSG"
  echo "       Çözüm: hPanel cron komutuna CRON_SECRET=... ekle ya da ~/.env.cron oluştur."
  echo "$MSG" >> "$LOG"
  exit 1
fi

# ── Çağrı ───────────────────────────────────────────────────────
URL="$BASE_URL$PATH_PART"
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

# curl bağlanamazsa da '000' basar; yine de boş/bozuk çıktıya karşı normalize et.
HTTP_CODE="$(curl -sS -X POST "$URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 120 \
  -o "$BODY_FILE" -w '%{http_code}' 2>>"$LOG")" || true
case "$HTTP_CODE" in
  [0-9][0-9][0-9]) ;;
  *) HTTP_CODE="000" ;;
esac

DURATION=$(( $(date +%s) - STARTED_TS ))
BODY="$(head -c 1000 "$BODY_FILE" | tr '\n' ' ')"

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  STATUS="OK"; EXIT_CODE=0
else
  STATUS="HATA"; EXIT_CODE=1
fi

# Log satırı (secret ASLA yazılmaz — yalnız hangi dosyadan okunduğu).
echo "$STARTED_AT $JOB $STATUS http=$HTTP_CODE süre=${DURATION}s secret=${SECRET_SOURCE:-?} url=$URL body=$BODY" >> "$LOG"

# Panele özet (Hostinger cron ekranı bu STDOUT'u "son çıktı" olarak gösterir).
echo "[cron] $STARTED_AT ludenlab/$JOB → $STATUS | http=$HTTP_CODE | süre=${DURATION}s"
echo "[cron] yanıt: $BODY"
if [ "$EXIT_CODE" -ne 0 ]; then
  echo "[cron] url=$URL secret kaynağı=${SECRET_SOURCE:-?} log=$LOG"
  if [ "$HTTP_CODE" = "401" ]; then
    echo "[cron] 401 → gönderilen token uçtakiyle uyuşmuyor (env'deki CRON_SECRET'ı kontrol et)"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "[cron] 404 → bu uç artık yok; görev hPanel'den kaldırılmalı"
  elif [ "$HTTP_CODE" = "000" ]; then
    echo "[cron] 000 → sunucuya hiç ulaşılamadı (ağ/DNS/timeout)"
  fi
fi
exit "$EXIT_CODE"
