import crypto from 'crypto';

export interface CloudinarySignature {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export function generateUploadSignature(
  folder: string = 'kumorpara/products'
): CloudinarySignature {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'kumorpara_mock';
  const apiKey = process.env.CLOUDINARY_API_KEY || 'mock_api_key';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || 'mock_api_secret';

  // Cloudinary signature format: folder=...&timestamp=...<secret>
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder,
  };
}
