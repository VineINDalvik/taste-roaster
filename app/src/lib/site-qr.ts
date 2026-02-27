import QRCode from "qrcode";
import { SITE_URL } from "@/lib/site";

let cachedTransparentQrDataUrl: string | null = null;

export async function getSiteQrTransparentDataUrl(): Promise<string> {
  if (cachedTransparentQrDataUrl) return cachedTransparentQrDataUrl;

  const make = async (light: string) =>
    QRCode.toDataURL(SITE_URL, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 240,
      color: {
        // QRCode expects hex colors (no rgba()).
        dark: "#ffffff",
        // Fully transparent background (no white square)
        light,
      },
    });

  let generated: string;
  try {
    generated = await make("#00000000");
  } catch {
    // Some builds only accept 4-digit hex (#RGBA).
    generated = await make("#0000");
  }

  cachedTransparentQrDataUrl = generated;
  return generated;
}
