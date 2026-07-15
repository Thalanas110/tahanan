import { GoogleAuth } from 'npm:google-auth-library';

export async function sendFcmMessage(fcmToken: string, payload: any) {
  try {
    const serviceAccountStr = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!serviceAccountStr) {
      console.error('FCM_SERVICE_ACCOUNT not set in edge function secrets.');
      return;
    }

    const credentials = JSON.parse(serviceAccountStr);

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const accessToken = await auth.getAccessToken();

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            data: payload,
            android: {
              priority: 'high',
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FCM Send Error:', response.status, errorText);
    } else {
      console.log('FCM sent successfully to token:', fcmToken);
    }
  } catch (err) {
    console.error('Failed to send FCM:', err);
  }
}
