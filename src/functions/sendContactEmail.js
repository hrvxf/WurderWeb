// functions/sendContactEmail.js
const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(functions.config().sendgrid.key); // set via `firebase functions:config:set sendgrid.key="YOUR_API_KEY"`

exports.sendContactEmail = functions.firestore
  .document("contactRequests/{requestId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const msg = {
      to: "your-email@domain.com",
      from: "noreply@wurder.app",
      subject: `New Contact Request: ${data.reason}`,
      text: `
        Name: ${data.name}
        Email: ${data.email}
        Reason: ${data.reason}
        Message:
        ${data.message}
      `,
    };
    try {
      await sgMail.send(msg);
      console.log("Email sent");
    } catch (err) {
      console.error("Error sending email:", err);
    }
  });
