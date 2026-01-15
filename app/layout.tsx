import {
  ClerkProvider,
  SignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Startup Valuation AI",
  description: "AI-Powered Financial Analyst",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {/* CASE 1: User is Logged Out -> Show Login Box */}
          <SignedOut>
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
              <div className="bg-white p-8 rounded-xl shadow-2xl text-center space-y-4">
                <h1 className="text-2xl font-bold text-slate-900">
                  Valuation AI 🔐
                </h1>
                <p className="text-slate-500 mb-4">
                  Please sign in to access your secure dashboard.
                </p>
                <SignIn routing="hash" />
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="absolute top-4 right-4 z-50">
              <UserButton afterSignOutUrl="/" />
            </div>
            {children}
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}
