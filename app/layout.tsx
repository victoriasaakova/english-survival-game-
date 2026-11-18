import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./coach.css";
export const metadata: Metadata = {
  title: "english coach",
  description:
    "Личное обучение B2 → C1: роли, диалоги, словарь и материалы обо мне.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "english coach",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f1ece4",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
