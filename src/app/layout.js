import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "Ask My Notes — AI Study Planner for University Exams",
    template: "%s | Ask My Notes",
  },
  description:
    "Upload your notes, ask AI questions, get personalised study plans, track weak topics, and ace your B.Tech, BCA, BSc and other university exams.",
  keywords: ["university exams", "b.tech study app", "bca study planner", "ai notes app"],
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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
