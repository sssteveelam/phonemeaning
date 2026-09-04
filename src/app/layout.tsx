import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phone Meaning Analyzer",
  description: "Tra cứu ý nghĩa & tìm số nổi bật"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
