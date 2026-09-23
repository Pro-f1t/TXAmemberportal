import type { Metadata } from "next";
import { Syne } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Texas Accelerate — Member Portal",
  description: "Opportunities, events, and announcements for Texas Accelerate members.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${syne.variable} antialiased`}>
      <body className="bg-bg text-white">
        <ScrollToTop />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
