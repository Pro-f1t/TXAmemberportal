import Image from "next/image";

/** Nav/footer lockup, rendered from `texas_accelerate_clean 1.png`. */
export default function Logo({
  className = "",
  height,
  heightClass,
  priority = false,
  style,
}: {
  className?: string;
  /** Fixed pixel height. Ignored when `heightClass` is set. */
  height?: number;
  /** Tailwind height utilities, for responsive sizing (e.g. "h-7 md:h-10"). */
  heightClass?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <Image
      src="/logo-wordmark.png"
      alt="Texas Accelerate"
      width={4728}
      height={744}
      // Source is 4728px wide; without this Next serves a 3840px variant for a
      // ~230px logo.
      sizes="256px"
      priority={priority}
      style={
        heightClass ? style : { height: height ?? 36, width: "auto", ...style }
      }
      className={`w-auto object-contain ${heightClass ?? ""} ${className}`}
    />
  );
}
