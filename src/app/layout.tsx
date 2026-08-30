import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoneyLens - Your Money, In Focus.",
  description:
    "Track your income, expenses, and savings goals with AI-powered insights. Smart receipt scanning, automated budgeting, and beautiful analytics.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen">
          {children}
          <Toaster
            position="bottom-right"
            richColors
            toastOptions={{
              style: {
                fontFamily: "Inter, system-ui, sans-serif",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
