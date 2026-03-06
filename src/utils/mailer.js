import nodemailer from "nodemailer";

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

export async function sendOtpEmail({ to, code }) {
  // ✅ PROD (Render free): préfère Resend (HTTP/HTTPS) plutôt que SMTP (ports bloqués)
  if (hasResend()) {
    const from =
      process.env.MAIL_FROM ||
      process.env.RESEND_FROM ||
      "SeatGo <onboarding@resend.dev>";

    const expiresMin = Number(process.env.OTP_EXPIRES_MIN || 10);
    const subject = "Votre code OTP SeatGo";

    const text = `Votre code de vérification SeatGo est : ${code}\n\nCe code expire dans ${expiresMin} minutes.`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 8px">Code de vérification SeatGo</h2>
        <p style="margin:0 0 10px">Voici votre code OTP :</p>
        <div style="font-size:24px;font-weight:700;letter-spacing:2px">${code}</div>
        <p style="margin:12px 0 0;color:#666">Ce code expire dans ${expiresMin} minute(s).</p>
      </div>
    `;

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
      // ignore
    }

    if (!resp.ok) {
      const msg = payload?.message || payload?.error || resp.statusText;
      console.error("❌ Resend error:", payload || msg);
      throw new Error(`Resend: ${msg}`);
    }

    console.log("✅ OTP email envoyé (Resend):", payload?.id || payload);
    return;
  }

  // Mode DEV: si SMTP non configuré, on log l'OTP côté serveur
  if (!hasSmtp()) {
    console.log(
      `\n🔐 [SeatGo OTP - DEV] ${to}: ${code} (expire dans ${
        process.env.OTP_EXPIRES_MIN || 10
      } min)\n`
    );
    return;
  }

  const port = Number(process.env.SMTP_PORT);
  const secure = port === 465; // 465 = SSL direct, 587 = STARTTLS

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // App Password (16 chars)
    },
    // anti "Unexpected socket close"
    connectionTimeout: 60_000,
    socketTimeout: 60_000,
  });

  // utile pour voir si c'est réseau/TLS/auth
  try {
    await transporter.verify();
    console.log("✅ SMTP prêt");
  } catch (e) {
    console.error("❌ SMTP verify error:", e?.message || e);
    throw e;
  }

  const from = process.env.SMTP_FROM || `SeatGo <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to,
    subject: "Votre code OTP SeatGo",
    text: `Votre code de vérification SeatGo est : ${code}\n\nCe code expire dans ${
      process.env.OTP_EXPIRES_MIN || 10
    } minutes.`,
  });
}