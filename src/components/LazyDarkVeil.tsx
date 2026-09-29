"use client";

import dynamic from "next/dynamic";

// The WebGL footer background (ogl) is decoration: load it after the page is
// interactive instead of in every page's first bundle. No SSR — it's a canvas.
const DarkVeil = dynamic(() => import("./DarkVeil"), { ssr: false });

export default DarkVeil;
