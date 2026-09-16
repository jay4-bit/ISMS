const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

function getExpiryTime(minutes: number): string {
  const expiry = new Date(Date.now() + minutes * 60_000);
  return expiry.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getConfig() {
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  const serviceId = process.env.EMAILJS_SERVICE_ID;

  if (!publicKey || !serviceId) {
    throw new Error(
      'EmailJS not configured. Set EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, and template IDs in your .env file.'
    );
  }

  return { publicKey, privateKey, serviceId };
}

async function sendEmail(
  templateId: string,
  templateParams: Record<string, string>
): Promise<void> {
  const { publicKey, privateKey, serviceId } = getConfig();

  const body: Record<string, unknown> = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: templateParams,
  };

  // Use private key for server-side requests (recommended for security)
  if (privateKey) {
    body.accessToken = privateKey;
  }

  const response = await fetch(EMAILJS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EmailJS error (${response.status}): ${text}`);
  }
}

export async function sendVerificationCode(
  email: string,
  code: string,
  userName: string
): Promise<void> {
  const templateId = process.env.EMAILJS_TEMPLATE_VERIFY;
  if (!templateId) {
    throw new Error('EMAILJS_TEMPLATE_VERIFY is not set in .env');
  }

  await sendEmail(templateId, {
    to_email: email,
    user_name: userName,
    code,
    time: getExpiryTime(10),
  });
}

export async function sendPasswordResetCode(
  email: string,
  code: string,
  userName: string
): Promise<void> {
  const templateId = process.env.EMAILJS_TEMPLATE_RESET;
  if (!templateId) {
    throw new Error('EMAILJS_TEMPLATE_RESET is not set in .env');
  }

  await sendEmail(templateId, {
    to_email: email,
    user_name: userName,
    code,
    time: getExpiryTime(10),
  });
}

export async function sendDeletionCode(
  email: string,
  code: string,
  shopName: string
): Promise<void> {
  const templateId = process.env.EMAILJS_TEMPLATE_DELETE;
  if (!templateId) {
    throw new Error('EMAILJS_TEMPLATE_DELETE is not set in .env');
  }

  await sendEmail(templateId, {
    to_email: email,
    shop_name: shopName,
    code,
    time: getExpiryTime(10),
  });
}
