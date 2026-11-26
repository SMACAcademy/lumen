import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { ProgressProvider } from "@/lib/progress";
import { ThemeSync } from "@/lib/theme";
import "./globals.css";

/** One display face, self-hosted by Next: titles, big numbers, buttons. */
const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Lumen — the science world", template: "%s · Lumen" },
  description:
    "Maths, physics and chemistry you can touch: predict, experiment and discover the laws yourself. Class 6 to 12, as far as JEE and NEET.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b17",
};

/** Apply the saved theme before first paint to avoid a flash. */
const themeScript = `try{var d=document.documentElement.dataset,t=localStorage.getItem("lab-theme");if(t==="light"||t==="dark")d.theme=t;var c=localStorage.getItem("lab-contrast");if(c==="high")d.contrast=c;var m=localStorage.getItem("lab-motion");if(m==="reduced")d.motion=m;}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ProgressProvider>
          <ThemeSync />
          {children}
        </ProgressProvider>
      </body>
    </html>
  );
}
