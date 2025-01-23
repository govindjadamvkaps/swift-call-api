import axios from "axios";

export const sendForgotMail = async (email, token) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const { BREVO_API, BREVO_EMAIL, BERVO_NAME } = process.env;
    const response = await axios.post(
      BREVO_API,
      {
        sender: { email: BREVO_EMAIL, name: BERVO_NAME },
        to: [{ email: email }],
        subject: "Reset Your Password",
        htmlContent: `
          <h1>Reset Your Password</h1>
          <p>Click the link below to reset your password. This link will expire in 24 hour.</p>
          <a href="${resetLink}">${resetLink}</a>
        `,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (Err) {
    // console.error("Error sending email:", Err);
    throw Err;
  }
};

export const emailSendAdmin = async (email, name, password) => {
  try {
    const { BREVO_API, BREVO_EMAIL, BERVO_NAME, BREVO_API_KEY } = process.env;

    if (!BREVO_API || !BREVO_EMAIL || !BERVO_NAME || !BREVO_API_KEY) {
      throw new Error(
        "Missing required environment variables for email service"
      );
    }

    const response = await axios.post(
      BREVO_API,
      {
        sender: { email: BREVO_EMAIL, name: BERVO_NAME },
        to: [{ email: email }],
        subject: "Welcome to Our Platform - Registration Successful",
        htmlContent: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Registration Successful</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f8; border-radius: 5px;">
              <tr>
                <td style="padding: 20px;">
                  <h1 style="color: #4a4a4a; text-align: center; margin-bottom: 20px;">Welcome, ${name}!</h1>
                  <p style="font-size: 16px; margin-bottom: 15px;">Thank you for registering with our platform. We're excited to have you on board!</p>
                  <div style="background-color: #ffffff; border-radius: 5px; padding: 15px; margin-bottom: 20px;">
                    <h2 style="color: #4a4a4a; font-size: 18px; margin-bottom: 10px;">Your Account Details</h2>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                  </div>
                  <p style="font-size: 14px; color: #666;">For security reasons, we recommend changing your password upon your first login.</p>
                 
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Email sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const deleteAccount = async (email, name) => {
  try {
    const { BREVO_API, BREVO_EMAIL, BERVO_NAME, BREVO_API_KEY } = process.env;

    if (!BREVO_API || !BREVO_EMAIL || !BERVO_NAME || !BREVO_API_KEY) {
      throw new Error(
        "Missing required environment variables for email service"
      );
    }

    const response = await axios.post(
      BREVO_API,
      {
        sender: { email: BREVO_EMAIL, name: BERVO_NAME },
        to: [{ email: email }],
        subject: "You're Account has delete in Swift-call",
        htmlContent: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Delete Account</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f8; border-radius: 5px;">
              <tr>
                <td style="padding: 20px;">
                  <h1 style="color: #4a4a4a; text-align: center; margin-bottom: 20px;">hello, ${name} your're account deleted successfully!</h1>
                 
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Email sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
