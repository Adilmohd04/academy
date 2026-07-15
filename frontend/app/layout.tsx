import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import "./admin/admin-premium.css";
import { Toaster } from "react-hot-toast";

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
    <ClerkProvider>
      <html lang="en">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Amiri:wght@400;700&family=Fredoka:wght@300..700&family=Cinzel:wght@400..900&display=swap"
            rel="stylesheet"
          />
          <script defer src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
        </head>
        <body className="font-sans">
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
        </body>
      </html>
    </ClerkProvider>
  );
}
