import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-roboto" });

export const metadata: Metadata = {
  title: "ebma AI — Voice & language intelligence",
  description: "Build intelligent voice and language experiences with ebma AI.",
  icons: {
    icon: [
      { url: "/ebma-mark.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={roboto.variable}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
