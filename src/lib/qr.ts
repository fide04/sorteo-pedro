import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "./config";

export const storeUrl = (token: string) => `${SITE_URL}/t/${token}`;

export function qrSvg(text: string) {
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#1b0a3c", light: "#ffffff" } });
}
