import type { Metadata } from "next";
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

// export const metadata: Metadata = {};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "ROCK PAPER SCISSORS",
    description: "Play Rock Paper Scissors on Base Sepolia!",
    other: {
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: "https://your-app.com/embed-image",
        button: {
          title: `Launch ROCK PAPER SCISSORS`,
          action: {
            type: "launch_miniapp",
            name: "ROCK PAPER SCISSORS",
            url: "https://rock-paper-scissors-mini-app.vercel.app",
            splashImageUrl:
              "https://rock-paper-scissors-mini-app.vercel.app/globe.svg",
            splashBackgroundColor: "#000000",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
