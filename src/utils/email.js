import axios from "axios";

export const sendForgotMail = async (email, token) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?${token}`;
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
