import QRCode from 'qrcode';

/**
 * Render the public verification URL as a QR data URL. The data URL is stored
 * with the certificate so an issued certificate always retains the exact QR
 * image associated with its immutable verification code.
 */
export async function generateVerificationQrDataUrl(verificationUrl: string): Promise<string> {
  return QRCode.toDataURL(verificationUrl, {
    width: 200,
    margin: 2,
    color: {
      dark: '#123852',
      light: '#FFFFFF',
    },
  });
}
