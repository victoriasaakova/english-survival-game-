import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Innerworld — English, in your own words",
  description: "Ваш английский. Ваши истории. Ваш мир.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Innerworld",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f5f0",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
