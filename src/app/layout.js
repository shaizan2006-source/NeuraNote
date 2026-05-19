import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import AIDustLayer from "@/components/AIDust/AIDustLayer";
import UtmCapture from "@/components/UtmCapture";
import "@/styles/variables.css";
import "@/styles/theme-animation.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://askmynotes.in";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Ask My Notes — AI Study Planner for JEE & NEET",
    template: "%s | Ask My Notes",
  },
  description:
    "AI-powered study planner for JEE Main, JEE Advanced, and NEET UG. PYQ bank, FSRS flashcards, mock tests, and personalised weak-topic detection.",
  keywords: ["JEE preparation", "NEET preparation", "JEE Main", "NEET UG", "PYQ bank", "JEE advanced", "b.tech study app", "ai notes app", "spaced repetition", "mock test"],
  authors: [{ name: "Ask My Notes" }],
  openGraph: {
    type: "website",
    url: BASE_URL,
    title: "Ask My Notes — AI Study Planner for University Exams",
    description: "Your AI tutor that reads your notes and answers exam questions instantly.",
    siteName: "Ask My Notes",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Ask My Notes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ask My Notes — AI Study Planner",
    description: "AI-powered study assistant for Indian competitive exams.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  viewport: { width: "device-width", initialScale: 1, maximumScale: 5 },
  themeColor: "#8B5CF6",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Ask My Notes" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <UtmCapture />
          <AIDustLayer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
