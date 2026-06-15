import { Resend } from "resend";
import { logError } from "@/lib/utils";
import { getBaseUrl } from "@/lib/baseUrl";

// Lazy-initialize so build-time page data collection (where env vars may be
// absent) doesn't crash. Build only imports the module; actual sends only
// happen at runtime where RESEND_API_KEY is set.
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}
const FROM = process.env.EMAIL_FROM ?? "LudenLab <noreply@ludenlab.com>";

function emailTemplate(opts: {
  title: string;
  heading: string;
  headingColor?: string;
  body: string;
  buttonText: string;
  url: string;
  footer: string;
}): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#023435;padding:28px 40px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">LudenLab</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${opts.headingColor ?? "#0f172a"};">${opts.heading}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                ${opts.body}
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#FE703A;border-radius:10px;">
                    <a href="${opts.url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      ${opts.buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Butona tıklanamıyorsa bu linki tarayıcınıza yapıştırın:<br/>
                <a href="${opts.url}" style="color:#FE703A;word-break:break-all;">${opts.url}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                ${opts.footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const html = emailTemplate({
    title: "Şifre Sıfırlama",
    heading: "Şifrenizi Sıfırlayın",
    headingColor: "#023435",
    body: `Şifrenizi sıfırlamak için aşağıdaki butona tıklayın.
                Bu link <strong>1 saat</strong> geçerlidir.`,
    buttonText: "Şifremi Sıfırla",
    url: resetUrl,
    footer: "Bu talebi siz yapmadıysanız bu emaili dikkate almayın.",
  });

  const { error } = await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Şifre Sıfırlama Talebi — LudenLab",
    html,
  });

  if (error) {
    logError("[email] sendPasswordResetEmail", error);
    throw new Error(`Email gönderilemedi: ${error.message}`);
  }
}

/**
 * Yeni destek erişim consent'i verildiğinde tüm admin'lere bildirim.
 *
 * Tek bir send'de `to: [adminEmails]` kullanmıyoruz — Resend bu durumda her
 * alıcıyı diğerlerinin "To" satırında gösterir (privacy/distraction). Sıralı
 * göndermek hem her admin'in mailbox'ında bağımsız ürün-içi bir thread olmasını
 * sağlar hem de bir alıcının fail olması diğerlerini etkilemez.
 */
export async function sendSupportConsentNotification(
  adminEmails: string[],
  user: { name: string; email: string },
  consent: { expiresAt: Date; reason: string | null },
  userDetailUrl: string,
): Promise<void> {
  if (adminEmails.length === 0) return;

  const expires = consent.expiresAt.toLocaleString("tr-TR");
  const reasonHtml = consent.reason
    ? `<p style="margin:0 0 12px;font-size:14px;color:#0f172a;"><strong>Sebep:</strong> ${consent.reason.replace(/[<>]/g, "")}</p>`
    : "";

  const body = `
    <p style="margin:0 0 12px;font-size:14px;color:#0f172a;"><strong>${user.name}</strong> (${user.email}) hesabına geçici destek erişimi izni verdi.</p>
    <p style="margin:0 0 12px;font-size:14px;color:#0f172a;"><strong>Geçerli:</strong> ${expires}'a kadar</p>
    ${reasonHtml}
  `;

  const html = emailTemplate({
    title: "Yeni Destek Erişim Talebi",
    heading: "Yeni Destek Erişim İzni",
    headingColor: "#023435",
    body,
    buttonText: "Kullanıcı Detayını Aç",
    url: userDetailUrl,
    footer: "Bu izin sayesinde admin paneli üzerinden bu kullanıcının hesabına 'Bu Kullanıcı Olarak Giriş' yapabilirsiniz. Tüm erişimler audit log'a yazılır.",
  });

  for (const to of adminEmails) {
    const { error } = await getResend().emails.send({
      from: FROM,
      to,
      subject: `Destek izni: ${user.name} — LudenLab`,
      html,
    });
    if (error) {
      // Diğer adminlere göndermeye devam — bir alıcının fail'i süreci durdurmaz.
      logError("[email] sendSupportConsentNotification", error);
    }
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;

  const html = emailTemplate({
    title: "Email Doğrulama",
    heading: "Email adresinizi doğrulayın",
    body: `LudenLab hesabınızı aktifleştirmek için aşağıdaki butona tıklayın.
                Bu link <strong>1 saat</strong> süreyle geçerlidir.`,
    buttonText: "Email Adresimi Doğrula",
    url: verifyUrl,
    footer: "Bu emaili siz talep etmediyseniz görmezden gelebilirsiniz.",
  });

  const { error } = await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "LudenLab — Email Adresinizi Doğrulayın",
    html,
  });

  if (error) {
    logError("[email] sendVerificationEmail", error);
    throw new Error(`Email gönderilemedi: ${error.message}`);
  }
}
