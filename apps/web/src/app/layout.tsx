import "./globals.css";

import { type Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import { cookies } from "next/headers";

import { QueryProvider } from "@/providers/QueryProvider";
import { Web3Provider } from "@/providers/Web3Provider";
import { WsProvider } from "@/providers/WsProvider";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShardVeil",
  description: "Decentralized NFT Card Game on Arbitrum",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="bg-veil-950 text-white font-body min-h-screen">
        <QueryProvider>
          <Web3Provider cookies={cookieHeader}>
            <WsProvider>{children}</WsProvider>
          </Web3Provider>
        </QueryProvider>
      </body>
    </html>
  );
}
