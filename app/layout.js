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

export const metadata = {
  title: "ANC Simulator | Active Noise Cancellation Demo",
  description:
    "Experience how Active Noise Cancellation works with ANC Simulator — an interactive demo that visualizes sound waves and noise reduction in real time.",
  keywords: [
    "ANC Simulator",
    "Active Noise Cancellation demo",
    "noise cancellation simulator",
    "ANC waveform demo",
    "audio noise reduction",
    "sound wave interference",
    "phase inversion",
    "noise cancelling technology",
    "headphone ANC",
    "interactive audio demo"
  ],
  authors: [{ name: "Priyangsu Banerjee", url: "https://ancsimulator.priyangsu.dev/" }],
  creator: "Priyangsu Banerjee",
  publisher: "ANC Simulator",
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  openGraph: {
    title: "ANC Simulator | Active Noise Cancellation Demo",
    description:
      "Visualize the science behind Active Noise Cancellation. Explore sound waves, interference, and phase inversion with this interactive simulator.",
    url: "https://ancsimulator.priyangsu.dev/",
    siteName: "ANC Simulator",
    images: [
      {
        url: "https://ancsimulator.priyangsu.dev/og-image.jpg", // Replace with your OG image URL
        width: 1200,
        height: 630,
        alt: "ANC Simulator App Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANC Simulator | Active Noise Cancellation Demo",
    description:
      "Discover how Active Noise Cancellation works with this engaging simulator — perfect for audio enthusiasts and learners.",
    images: ["https://ancsimulator.priyangsu.dev/og-image.jpg"],
  },
  metadataBase: new URL("https://ancsimulator.priyangsu.dev"),
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
