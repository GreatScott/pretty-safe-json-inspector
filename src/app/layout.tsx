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

export const metadata: Metadata = {
  title: "Pretty Safe JSON Inspector - Free Online JSON, YAML, XML Formatter",
  description: "Free online JSON formatter and code snippet generator. Format JSON, YAML, XML, CSS, and SQL with 100% client-side processing. Generate Python, JavaScript, Go code snippets to access data. Privacy-focused with no data collection.",
  keywords: "JSON formatter, JSON pretty print, YAML formatter, XML formatter, JSON viewer, code formatter, JSON parser, data formatter, privacy-focused, client-side, code generator, Python JSON, JavaScript JSON",
  authors: [{ name: "Scott", url: "https://github.com/greatscott" }],
  creator: "Scott",
  openGraph: {
    title: "Pretty Safe JSON Inspector - Free JSON & Code Formatter",
    description: "Format JSON, YAML, XML and generate code snippets. 100% client-side processing, no data collection. Perfect for developers working with APIs and configuration files.",
    url: "https://prettysafejson.xyz",
    siteName: "Pretty Safe JSON Inspector",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pretty Safe JSON Inspector - Free JSON Formatter",
    description: "Privacy-focused JSON formatter with code generation. Format JSON, YAML, XML with zero data collection.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

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
