/**
 * @ludenlab/billing — Paynkolay (nkolay VPOS) tip tanımları.
 * config-driven istemci + sade sonuç nesneleri.
 */

/**
 * Paynkolay merchant kimliği — operasyon-bazlı ÇOKLU sx + ortak secret.
 * Operasyon-bazlı çoklu token: satış/listeleme/iptal ayrı sx + ortak secret.
 */
export interface PaynkolayConfig {
  /** Satış sx (ödeme). */
  salesSx: string;
  /** Listeleme/teyit sx (PaymentList). */
  listSx: string;
  /** İptal/iade sx (satış sx'inden FARKLI). */
  cancelSx: string;
  /** Tüm hash'lerde ortak gizli anahtar. */
  merchantSecretKey: string;
  /** Host kökü; test: https://paynkolaytest.nkolayislem.com.tr — prod: https://paynkolay.nkolayislem.com.tr */
  baseUrl: string;
}

/** Müşteri/fatura bilgisi (hosted form opsiyonel alanları). */
export interface PaynkolayCustomer {
  nameSurname?: string;
  email?: string;
  phone?: string;
  tckn?: string;
  address?: string;
}

/** Hosted ödeme formu girdisi (ilk ödeme + opsiyonel kart saklama). */
export interface HostedPaymentInput {
  clientRefCode: string;
  amount: string | number;
  successUrl: string;
  failUrl: string;
  cardHolderIP: string;
  installmentNo?: number;
  /** Kartı sakla (tokenizasyon). true ise customerKey zorunlu, 3DS şart. */
  saveCard?: boolean;
  /** Müşteri tanımlayıcısı (TC/GSM/e-posta gibi) — saklama ve hash için. */
  customerKey?: string;
  customer?: PaynkolayCustomer;
  /** rnd verilmezse şimdiki zamanla üretilir. */
  rnd?: string;
}

/** Auto-submit edilecek imzalı hosted form (consumer render eder). */
export interface HostedPaymentForm {
  /** Form action URL (POST). */
  action: string;
  /** Gizli alanlar (hashDatav2 dahil). */
  fields: Record<string, string>;
}

/** Saklı karttan ödeme (abonelik yenileme — sunucudan sunucuya, PAN yok). */
export interface ChargeStoredCardInput {
  clientRefCode: string;
  amount: string | number;
  successUrl: string;
  failUrl: string;
  cardHolderIP: string;
  csCustomerKey: string;
  csToken?: string;
  csTranId?: string;
  installmentNo?: number;
}

/** Ödeme/işlem sonucu (S2S). */
export interface PaynkolayPaymentResult {
  status: "success" | "failure";
  responseCode?: string;
  responseData?: string;
  authCode?: string;
  referenceCode?: string;
  raw: Record<string, unknown>;
}

export interface TransactionListInput {
  startDate: string;
  endDate: string;
  /** Boş bırakılırsa tarih aralığındaki tüm işlemler. */
  clientRefCode?: string;
}
export interface TransactionListItem {
  referenceCode?: string;
  status?: string;
  amount?: string;
  trxDate?: string;
}
export interface TransactionListResult {
  status: "success" | "failure";
  items: TransactionListItem[];
  raw: Record<string, unknown>;
}

export interface CancelRefundInput {
  referenceCode: string;
  type: "cancel" | "refund";
  amount: string | number;
  trxDate: string;
}

/** Basit komut sonucu (iptal/iade, kart silme). */
export interface SimpleResult {
  status: "success" | "failure";
  responseCode?: string;
  raw: Record<string, unknown>;
}

export interface SavedCard {
  token?: string;
  cardAlias?: string;
  maskedNumber?: string;
}
export interface SavedCardListResult {
  status: "success" | "failure";
  cards: SavedCard[];
  raw: Record<string, unknown>;
}

/** Paynkolay istemci yüzeyi. */
export interface PaynkolayClient {
  /** İlk ödeme/tokenizasyon için imzalı hosted form üretir (network yok). */
  buildHostedPaymentForm(input: HostedPaymentInput): HostedPaymentForm;
  /** Saklı karttan ödeme alır (yenileme; S2S, 3DS'siz). */
  chargeStoredCard(input: ChargeStoredCardInput): Promise<PaynkolayPaymentResult>;
  /** İşlemleri listeler — callback'i sunucudan teyit için. */
  listTransactions(input: TransactionListInput): Promise<TransactionListResult>;
  /** İptal (aynı gün) / iade (sonraki günler). */
  cancelOrRefund(input: CancelRefundInput): Promise<SimpleResult>;
  /** Bir müşterinin saklı kartlarını listeler (token almak için). */
  listSavedCards(customerKey: string): Promise<SavedCardListResult>;
  /** Saklı kartı siler. */
  deleteSavedCard(customerKey: string, token: string): Promise<SimpleResult>;
}
