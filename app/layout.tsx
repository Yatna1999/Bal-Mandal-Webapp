import type { Metadata } from "next";
import { Shrikhand, Hind_Vadodara, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const shrikhand = Shrikhand({
  weight: "400",
  subsets: ["gujarati", "latin"],
  variable: "--font-display-face",
  display: "swap",
});

const hind = Hind_Vadodara({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["gujarati", "latin"],
  variable: "--font-ui-face",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-data-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "બાળ સભા સંચાલન પ્રણાલી",
  description: "Paldi Vistar Bal Sabha Management System",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="gu"
      className={`${shrikhand.variable} ${hind.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
