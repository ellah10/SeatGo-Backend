export function generateOtp6() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export function otpExpiresAt() {
  const minutes = Number(process.env.OTP_EXPIRES_MIN || 10);
  return new Date(Date.now() + minutes * 60 * 1000);
}
