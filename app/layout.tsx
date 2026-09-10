import type { Metadata } from "next";
import "./globals.css";

// Deliberately using the system font stack (see globals.css) rather than
// next/font/google — this build environment has no network access to
// fonts.googleapis.com, and a fintech app's UI doesn't need a custom
// webfont badly enough to take on that runtime/build dependency.

export const metadata: Metadata = {
  title: "PAYDER",
  description: "PAYDER — wallet, bills, airtime/data, and exam e-pins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
