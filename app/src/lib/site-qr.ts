import QRCode from "qrcode";
import { SITE_URL } from "@/lib/site";

let cachedTransparentQrDataUrl: string | null = null;

export async function getSiteQrTransparentDataUrl(): Promise<string> {
  if (cachedTransparentQrDataUrl) return cachedTransparentQrDataUrl;

  const generated = await QRCode.toDataURL(SITE_URL, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 240,
    color: {
      // White-ish modules for dark backgrounds
      dark: "rgba(255,255,255,0.92)",
      // Fully transparent background (no white square)
      light: "#0000",
    },
  });

  cachedTransparentQrDataUrl = generated;
  return generated;
}
