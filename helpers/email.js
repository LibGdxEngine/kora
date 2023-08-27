const nodeMailer = require("nodemailer");

exports.sendEmailToSupport = (req, res, emailData) => {
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,

    auth: {
      user: "letaskono.app1445@gmail.com", // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
      pass: "cgjofpeyhnfycotw",
    },
    tls: {
      ciphers: "SSLv3",
    },
  });

  return transporter
    .sendMail(emailData)
    .then((info) => {
      console.log(`Message sent: ${info.response}`);
      // return res.json({
      //   success: true,
      // });
    })
    .catch((err) => console.log(`Problem sending email: ${err}`));
};

exports.sendEmailWithNodemailer = (req, res, emailData) => {
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,

    auth: {
      user: "letaskono.app2@gmail.com", // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
      // pass: "fuajanriezwwcvhn", // MAKE SURE THIS PASSWORD IS YOUR GMAIL APP PASSWORD WHICH YOU GENERATED EARLIER
      pass: "hlasxfgsjfaftjww",
    },
    tls: {
      ciphers: "SSLv3",
    },
  });

  return transporter
    .sendMail(emailData)
    .then((info) => {
      console.log(`Message sent: ${info.response}`);
      // return res.json({
      //   success: true,
      // });
    })
    .catch((err) => console.log(`Problem sending email: ${err}`));
};

exports.sendEmailForgotPassword = (req, res, emailData) => {
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: "letaskono.app2@gmail.com", // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
      // pass: "fuajanriezwwcvhn", // MAKE SURE THIS PASSWORD IS YOUR GMAIL APP PASSWORD WHICH YOU GENERATED EARLIER
      pass: "hlasxfgsjfaftjww",
    },
    tls: {
      ciphers: "SSLv3",
    },
  });

  return transporter
    .sendMail(emailData)
    .then((info) => {
      return res.json({
        message: `لقد تم ارسال رسالة جديدة إلى حسابك ${emailData.to}`,
      });
    })
    .catch((err) => console.log(`Problem sending email: ${err}`));
};

exports.sendEmailAccountActivation = (req, res, emailData) => {
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: "letaskono.app2@gmail.com", // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
      // pass: "fuajanriezwwcvhn", // MAKE SURE THIS PASSWORD IS YOUR GMAIL APP PASSWORD WHICH YOU GENERATED EARLIER
      pass: "hlasxfgsjfaftjww",
    },
    tls: {
      ciphers: "SSLv3",
    },
  });

  return transporter
    .sendMail(emailData)
    .then((info) => {
      return res.json({
        message: `لقد تم ارسال رسالة جديدة إلى حسابك ${emailData.to}`,
      });
    })
    .catch((err) => console.log(`حدث خطأ أثناء إرسال البريد: ${err}`));
};
