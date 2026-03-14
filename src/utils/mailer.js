import nodemailer from "nodemailer";

function hasSendGrid() {
  return Boolean(process.env.SENDGRID_API_KEY);
}

function hasResend() {
  return Boolean(process.env.RESEND_API_KEY);
}

function hasSmtp() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function getOtpTemplate(code, expiresMin) {
  const subject = "Votre code OTP SeatGo";

  const text = `Votre code de vérification SeatGo est : ${code}

Ce code expire dans ${expiresMin} minutes.`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin:0 0 12px;color:#1e4b9b;">Code de vérification SeatGo</h2>
      <p style="margin:0 0 12px;">Voici votre code OTP :</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;color:#27b36a;margin:16px 0;">
        ${code}
      </div>
      <p style="margin:12px 0 0;color:#6b7280;">
        Ce code expire dans ${expiresMin} minute(s).
      </p>
    </div>
  `;

  return { subject, text, html };
}

export async function sendOtpEmail({ to, code }) {
  const expiresMin = Number(process.env.OTP_EXPIRES_MIN || 10);
  const { subject, text, html } = getOtpTemplate(code, expiresMin);

  console.log("📨 MAIL DEBUG", {
    hasSendGrid: hasSendGrid(),
    hasResend: hasResend(),
    hasSmtp: hasSmtp(),
    SENDGRID_API_KEY: Boolean(process.env.SENDGRID_API_KEY),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    RESEND_API_KEY_LEN: process.env.RESEND_API_KEY?.length || 0,
    SMTP_HOST: Boolean(process.env.SMTP_HOST),
    SMTP_PORT: Boolean(process.env.SMTP_PORT),
    SMTP_USER: Boolean(process.env.SMTP_USER),
    SMTP_PASS: Boolean(process.env.SMTP_PASS),
    MAIL_FROM: process.env.MAIL_FROM || null,
    SENDGRID_FROM: process.env.SENDGRID_FROM || null,
    RESEND_FROM: process.env.RESEND_FROM || null,
    SMTP_FROM: process.env.SMTP_FROM || null,
    to,
  });

  // 1) PRIORITÉ: SENDGRID
  if (hasSendGrid()) {
    const from =
      process.env.MAIL_FROM ||
      process.env.SENDGRID_FROM ||
      "SeatGo <noreply@seatgo.app>";

    try {
      const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to }],
              subject,
            },
          ],
          from: {
            email: extractEmail(from),
            name: extractName(from) || "SeatGo",
          },
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html },
          ],
        }),
      });

      let raw = null;
      try {
        raw = await resp.text();
      } catch {
        raw = null;
      }

      console.log("📨 SENDGRID STATUS:", resp.status);

      if (!resp.ok) {
        console.error("❌ SendGrid error:", raw || resp.statusText);
        throw new Error(`SendGrid: ${raw || resp.statusText}`);
      }

      console.log(`✅ OTP email envoyé (SendGrid) à ${to}`);
      return;
    } catch (error) {
      console.error("❌ SendGrid send failed:", error?.message || error);
      throw error;
    }
  }

  // 2) FALLBACK: RESEND
  if (hasResend()) {
    const from =
      process.env.MAIL_FROM ||
      process.env.RESEND_FROM ||
      "SeatGo <onboarding@resend.dev>";

    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      let payload = null;
      try {
        payload = await resp.json();
      } catch {
        payload = null;
      }

      console.log("📨 RESEND STATUS:", resp.status);
      console.log("📨 RESEND PAYLOAD:", payload);

      if (!resp.ok) {
        const msg = payload?.message || payload?.error || resp.statusText;
        console.error("❌ Resend error:", payload || msg);
        throw new Error(`Resend: ${msg}`);
      }

      console.log("✅ OTP email envoyé (Resend):", payload?.id || payload);
      return;
    } catch (error) {
      console.error("❌ Resend send failed:", error?.message || error);
      throw error;
    }
  }

  // 3) FALLBACK: SMTP
  if (hasSmtp()) {
    const port = Number(process.env.SMTP_PORT);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 60_000,
      socketTimeout: 60_000,
    });

    try {
      await transporter.verify();
      console.log("✅ SMTP prêt");
    } catch (e) {
      console.error("❌ SMTP verify error:", e?.message || e);
      throw e;
    }

    const from = process.env.SMTP_FROM || `SeatGo <${process.env.SMTP_USER}>`;

    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      console.log(`✅ OTP email envoyé (SMTP) à ${to}`);
      return;
    } catch (error) {
      console.error("❌ SMTP send failed:", error?.message || error);
      throw error;
    }
  }

  // 4) DEV MODE
  console.log("⚠️ Aucun provider mail détecté. Bascule en DEV MODE.");
  console.log(
    `\n🔐 [SeatGo OTP - DEV] ${to}: ${code} (expire dans ${expiresMin} min)\n`
  );
}

function extractEmail(from) {
  const match = from.match(/<(.+?)>/);
  return match ? match[1].trim() : from.trim();
}

function extractName(from) {
  const match = from.match(/^(.*?)</);
  return match ? match[1].trim().replace(/^"|"$/g, "") : "";
}