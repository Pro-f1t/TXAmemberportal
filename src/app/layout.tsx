import type { Metadata } from "next";
import { Syne } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import HideOn from "@/components/HideOn";
import ScrollToTop from "@/components/ScrollToTop";
import NavGuard from "@/components/NavGuard";

// If one of the page's script files fails to download (flaky wifi, or a tab that
// outlived a deployment), the page never becomes interactive and every button is
// dead until a manual refresh. Reload once, automatically. Inline so it works
// even when the app's own scripts didn't load; rate-limited so it can't loop.
const RELOAD_ON_SCRIPT_FAILURE = `(function(){var k="txa-script-reload";window.addEventListener("error",function(e){var t=e.target;if(!t||t.tagName!=="SCRIPT"||!t.src||t.src.indexOf("/_next/static/")<0)return;try{var last=+sessionStorage.getItem(k)||0;if(Date.now()-last<60000)return;sessionStorage.setItem(k,String(Date.now()))}catch(_){return}location.reload()},true)})();`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: RELOAD_ON_SCRIPT_FAILURE }} />
      </head>
      <body className="bg-bg text-white">
        <NavGuard />
        <ScrollToTop />
        <Nav />
        <main>{children}</main>
        <HideOn prefixes={["/live", "/admin"]}><Footer /></HideOn>
      </body>
    </html>
  );
}
