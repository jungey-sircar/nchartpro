import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { QuizProvider }  from "../components/QuizProvider";
import SupportChat           from "../components/SupportChat";
import ScaleFactorSetter     from "../components/ScaleFactorSetter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NChartPro — Real-time Charts & Insights",
  description:
    "Professional charting, AI-powered market analysis, and advanced screening tools for modern traders.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const resCookie   = cookieStore.get('x-client-resolution');
  const clientWidth = resCookie ? parseInt(resCookie.value, 10) : 1920;
  const scaleFactor = Math.min(1.5, Math.max(0.5, clientWidth / 1920));

  return (
    <html
      lang="en"
      data-theme="app-default"
      className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable}`}
      style={{ '--scale-factor': scaleFactor } as React.CSSProperties}
      suppressHydrationWarning
    >
      <body style={{ margin: 0, minHeight: "100vh" }} suppressHydrationWarning>
        <ThemeProvider><QuizProvider>{children}</QuizProvider><SupportChat /></ThemeProvider>
        <ScaleFactorSetter />
      </body>
    </html>
  );
}
