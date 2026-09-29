import DarkVeil from "./LazyDarkVeil";
import Logo from "./Logo";
import { InstagramIcon, LinkedInIcon } from "./Icons";
import { SOCIALS } from "@/data/site";

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-footer">
      {/* Same shader as the hero, over-sized and anchored off the bottom-right,
          hue-shifted cooler and warped harder so it doesn't read as a repeat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[25%] -bottom-[40%] -z-10 h-[185%] w-[125%] opacity-60"
      >
        <DarkVeil speed={0.6} hueShift={28} warpAmount={1.2} resolutionScale={0.6} />
      </div>

      <div className="shell pt-24 pb-12 md:pt-32 md:pb-14">
        <h2 className="h-display lg:whitespace-nowrap">Accelerate your career now</h2>
        <p className="t-body mt-4 max-w-lg text-muted">
          Bridging the gap between students and work that actually matters.
        </p>

        <div className="mt-14 flex flex-col items-start gap-4 border-t border-white/10 pt-6 md:mt-20 md:flex-row md:items-center md:justify-between">
          <Logo heightClass="h-8 md:h-10" />

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
            <div className="flex items-center gap-4">
              <a
                href={SOCIALS.linkedin}
                aria-label="Texas Accelerate on LinkedIn"
                target="_blank"
                rel="noreferrer"
                className="text-white/70 transition-colors hover:text-accent"
              >
                <LinkedInIcon className="h-5 w-5" />
              </a>
              <a
                href={SOCIALS.instagram}
                aria-label="Texas Accelerate on Instagram"
                target="_blank"
                rel="noreferrer"
                className="text-white/70 transition-colors hover:text-accent"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            </div>

            <p className="text-txs text-white/60">
              © 2026 Texas Accelerate, All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
