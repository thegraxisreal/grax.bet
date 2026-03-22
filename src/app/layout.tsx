import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

// Disable SSR for the entire client layout — Firebase SDK must only run in the
// browser; server-side evaluation causes React hydration mismatches (#418/#423/#425).
const ClientLayout = dynamic(() => import("@/components/ClientLayout"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "thegraxisreal gamble",
  description: "Premium fake money casino — for fun with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
