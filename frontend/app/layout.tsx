import type { Metadata } from "next";
import { Nunito, Amiri } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const sans = Nunito({ 
  subsets: ["latin"],
  variable: '--font-sans',
});

const serif = Amiri({ 
  weight: ['400', '700'],
  subsets: ["arabic", "latin"],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: "Academy",
  description: "Learning Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Razorpay Checkout Script */}
        <Script 
          src="https://checkout.razorpay.com/v1/checkout.js" 
          strategy="lazyOnload"
        />
      </head>
      <body className={`${sans.variable} ${serif.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            }} 
          />
        </Providers>
      </body>
    </html>
  );
}
