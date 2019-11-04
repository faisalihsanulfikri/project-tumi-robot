const { User } = require("../models");
const { Security } = require("../models");
const { Robot } = require("../models");
const { Master_Setting } = require("../models");
const { User_Setting } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

const authService = require("../services/auth.service");
const pug = require("pug");
const randomstring = require("randomstring");
 
const mailgun = require("mailgun-js");
const moment = require("moment");
const APP_CONFIG = require("../config/app_config");

const API_KEY = process.env.MAIL_GUN_API_KEY;
const DOMAIN = process.env.MAIL_GUN_DOMAIN;
const MAIL = process.env.MAIL_GUN_MAIL;

// function register user
module.exports.register = async function(req, res) {
  const body = req.body;
  let default_pass = process.env.DEFAULT_PASS_USER_TUMI;

  // user data
  let userData = {};
  userData.username = body.user.username;
  userData.email = body.user.email;
  userData.phone = body.user.phone;
  userData.register_date = moment().format("YYYY-MM-DD H:mm:ss");
  userData.status = "pending";
  userData.level = "1";
  userData.password = default_pass;
  userData.createdAt = moment().format("YYYY-MM-DD H:mm:ss");
  userData.updatedAt = moment().format("YYYY-MM-DD H:mm:ss");

  // security data
  let securityData = {};
  securityData.username = body.security.username;
  securityData.password = body.security.password;
  securityData.pin = body.security.pin;
  securityData.createdAt = moment().format("YYYY-MM-DD H:mm:ss");
  securityData.updatedAt = moment().format("YYYY-MM-DD H:mm:ss");

  if (!userData.unique_key && !userData.email) {
    return ReE(res, "Silakan masukkan email untuk mendaftar.", 422);
  }
  if (!userData.phone) {
    return ReE(res, "Silakan masukkan nomor telepon untuk mendaftar.", 422);
  }
  if (userData.phone.length < 10 || userData.phone.length > 20) {
    return ReE(res, "Format nomor telepon tidak valid.", 422);
  }
  if (!userData.password) {
    return ReE(res, "Silakan masukkan password untuk mendaftar.", 422);
  }
  if (!userData.username) {
    return ReE(res, "Silakan masukkan nama lengkap untuk mendaftar.", 422);
  }
  if (!securityData.username) {
    return ReE(res, "Silakan masukkan nama sekuritas untuk mendaftar.", 422);
  }
  if (!securityData.password) {
    return ReE(
      res,
      "Silakan masukkan password sekuritas untuk mendaftar.",
      422
    );
  }
  if (!securityData.pin) {
    return ReE(res, "Silakan masukkan pin sekuritas untuk mendaftar.", 422);
  }

  let err, user, security, robot;

  // insert to db user
  [err, user] = await to(authService.createUser(userData));
  if (err) return ReE(res, err, 422);

  // insert to db security
  [err, security] = await to(Security.create(securityData));
  if (err) return ReE(res, err, 422);

  // robot data
  let robotData = {};
  robotData.user_id = user.id;
  robotData.security_id = security.id;
  robotData.status = "off";
  robotData.createdAt = moment().format("YYYY-MM-DD H:mm:ss");
  robotData.updatedAt = moment().format("YYYY-MM-DD H:mm:ss");

  [err, robot] = await to(Robot.create(robotData));
  if (err) return ReE(res, err, 422);

  // send user registration email
  exports.userRegistrationEmail(user.email);

  return ReS(
    res,
    {
      message: "Berhasil membuat akun baru. Silakan mengecek email anda."
    },
    201
  );
};

// function login user
module.exports.login = async function(req, res) {
  const body = req.body;
  let err, user;

  [err, user] = await to(authService.authUser(body));
  if (err) return ReE(res, err, 422);

  if (user.status == "active") {
    return ReS(res, { access_token: user.getJWT(), user: user.toWeb() });
  } else {
    return ReE(
      res,
      "Akun anda belum aktif, mohon menunggu pemberitahuan lebih lanjut yang akan disampaikan melalui email.",
      422
    );
  }
};

//function login admin
module.exports.login_admin = async function(req, res) {
  let body = req.body;
  let error, user;

  [error, user] = await to(authService.authUser(body));
  if (error) return ReE(res, error, 422);

  if (user.level == "0") {
    return ReS(res, { access_token: user.getJWT(), user: user.toWeb() });
  } else {
    return ReE(res, "Anda bukan admin", 422);
  }
};

// function get user by id
module.exports.get = async function(req, res) {
  let user, user_id, err;
  user_id = req.params.user_id;

  [err, user] = await to(User.findOne({ where: { id: user_id } }));
  if (err) return ReE(res, "User tidak ditemukan", 422);
  if (!user)
    return ReE(res, "User dengan id: " + user_id + " tidak ditemukan", 422);

  return ReS(res, { user: user.toWeb() });
};

// function get user all
module.exports.getAll = async function(req, res) {
  let userData, securityData, robotData;

  [err, userData] = await to(User.findAll({ raw: true }));
  [err, securityData] = await to(Security.findAll({ raw: true }));
  [err, robotData] = await to(Robot.findAll({ raw: true }));

  let data = [];

  robotData.forEach((rd, i) => {
    let filter_user = userData.filter(ud => {
      return ud.id == rd.user_id;
    });
    let filter_security = securityData.filter(sd => {
      return sd.id == rd.security_id;
    });

    data[i] = {
      id: filter_user[0].id,
      security_user_id: filter_security[0].username,
      username: filter_user[0].username,
      email: filter_user[0].email,
      phone: filter_user[0].phone,
      password: filter_security[0].password,
      active_date: filter_security[0].active_date,
      expire_date: filter_security[0].expire_date,
      status: filter_user[0].status
    };
  });

  return ReS(res, { data: data });
};

// function update user
module.exports.update = async function(req, res) {
  let user, data, user_id, err;
  user_id = req.params.user_id;

  data = req.body;

  [err, user] = await to(User.findOne({ where: { id: user_id } }));
  if (err) return ReE(res, "User tidak ditemukan", 422);
  if (!user)
    return ReE(res, "User dengan id: " + user_id + " tidak ditemukan", 422);

  user.set(data);

  [err, user] = await to(user.save());
  if (err) {
    if (err.message == "Validation error")
      err = "Alamat email atau nomor telepon sudah digunakan";
    return ReE(res, err, 422);
  }
  return ReS(res, { message: "User diperbaharui: " + user.email });
};

// function remove user
module.exports.remove = async function(req, res) {
  let user, user_id, err;
  user_id = req.params.user_id;

  [err, user] = await to(User.findOne({ where: { id: user_id } }));
  if (err) return ReE(res, "User tidak ditemukan", 422);
  if (!user)
    return ReE(res, "User dengan id: " + user_id + " tidak ditemukan", 422);

  [err, user] = await to(user.destroy());
  if (err) return ReE(res, "User gagal dihapus", 422);

  return ReS(res, { message: "User terhapus" });
};

// function user activation
module.exports.userActivation = async function(req, res) {
  const body = req.body;
  let user, user_id, err;
  let default_pass = process.env.DEFAULT_PASS_USER_TUMI;
  user_id = req.params.user_id;

  // user data
  let userData = {};
  userData.status = body.status;
  userData.level = "1";
  userData.password = default_pass;
  userData.updatedAt = moment().format("YYYY-MM-DD H:mm:ss");

  if (
    userData.status == "pending" ||
    userData.status == "active" ||
    userData.status == "suspend"
  ) {
    [err, user] = await to(User.findOne({ where: { id: user_id } }));
    if (err) return ReE(res, "User tidak ditemukan", 422);
    if (!user)
      return ReE(res, "User dengan id: " + user_id + " tidak ditemukan", 422);

    let currentStatus = user.status;

    user.set(userData);

    [err, user] = await to(user.save());
    if (err) {
      if (err.message == "Validation error")
        err = "Oops. Ada sesuatu yang tidak beres . .";
      return ReE(res, err, 422);
    }

    // create default user setting
    if (userData.status == "active" && currentStatus == "pending") {
      // active date
      let err, robot, security;

      [err, robot] = await to(Robot.findOne({ where: { user_id: user.id } }));
      [err, security] = await to(
        Security.findOne({ where: { id: robot.security_id } })
      );

      let now = moment().format("YYYY-MM-DD H:mm:ss");

      let securityData = {};
      securityData.active_date = moment().format("YYYY-MM-DD H:mm:ss");
      securityData.expire_date = moment(now, "YYYY-MM-DD H:mm:ss").add(
        3,
        "months"
      );
      securityData.updatedAt = moment().format("YYYY-MM-DD H:mm:ss");

      security.set(securityData);
      [err, security] = await to(security.save());

      // generate setting
      let m_setting, setting;
      let u_setting = [];
      [err, m_setting] = await to(Master_Setting.findAll({ raw: true }));

      m_setting.forEach(async (ms, i) => {
        let config_data = {};
        config_data = {
          master_setting_id: ms.id,
          config_value: ms.config_value,
          user_id: user.id
        };

        u_setting[i] = config_data;
        [err, setting] = await to(User_Setting.create(config_data));
      });
    }

    // send user activation email
    if (userData.status == "active" && currentStatus == "pending") {
      exports.userActivationEmail(user.email, default_pass);
    }

    return ReS(res, { message: "User " + user.username + " telah aktif" });
  }
};

// email user registration
module.exports.userRegistrationEmail = async function(email) {
  const mg = mailgun({ apiKey: API_KEY, domain: DOMAIN });
  const data = {
    from: "Admin Robot Tumi <" + MAIL + ">",
    to: email,
    subject: "User Registration",
    html: pug.renderFile("./views/mail/user_registration.pug")
  };
  mg.messages().send(data, function(error, body) {});
};

// Reset Password
module.exports.send_email_reset_password = async function(req, res) {
    let user, body, reset_token, email, err;
    email = req.body.email;

    reset_token = randomstring.generate();
    
    // body = req.body;
    // body.reset_token = reset_token
    body = {
      "reset_token" : reset_token
    };

    [err, user] = await to(User.findOne({ where: { email: email } }));
    if (err) return ReE(res, "err finding user", 422);
    
    user.set(body);

    [err, user] = await to(user.save());    
    
    const mailgun = require('mailgun-js')({apiKey: API_KEY, domain: DOMAIN});
    
    const data = {
      from: "Admin Robot Tumi <admin@robottradingsaham.com>",
      to: email,
      subject: "User Reset Password",
      html: pug.renderFile("./views/mail/reset_password.pug",{reset_token: reset_token})
    };
    
    mailgun.messages().send(data, function (error,body) {
      console.log(body);
    });

    return ReS(res, { message: "Kirim Email " + email });
};

module.exports.reset_password = async function(req, res) {
  let user, err, body;
  let reset_token = req.params.reset_token;
  let data = {};
  body = req.body;

  data = {
    password: body.password,
    reset_token: ""
  };

  [err, user] = await to(User.findOne({ where: { reset_token: reset_token } }));
  if (err) return ReE(res, "User tidak ditemukan", 422);
  if (!user)
    return ReE(res, "User dengan reset token: " + reset_token + " tidak ditemukan", 422);

  user.set(data);

  [err, user] = await to(user.save());
  if (err) {
    if (err.message == "Validation error")
      err = "Alamat email atau nomor telepon sudah digunakan";
    return ReE(res, err, 422);
  }
  return ReS(res, { message: "User diperbaharui: " + data });
};

// email user activation
module.exports.userActivationEmail = async function(email, password) {
  const mg = mailgun({ apiKey: API_KEY, domain: DOMAIN });
  const data = {
    from: "Admin Robot Tumi <" + MAIL + ">",
    to: email,
    subject: "User Activation",
    html: pug.renderFile("./views/mail/user_activation.pug", {
      email: email,
      password: password
    })
  };
  mg.messages().send(data, function(error, body) {});
};

const change_password = async function(req, res) {
  let user, data, user_id, err;
  user_id = req.params.user_id;

  data = req.body;

  [err, user] = await to(User.findOne({ where: { id: user_id } }));
  if (err) return ReE(res, "err finding user");
  if (!user) return ReE(res, "user not found with id: " + user_id, 422);

  user.set(data);

  [err, user] = await to(user.save());
  return ReS(res, { message: "change Password: " + user.password });
};
module.exports.change_password = change_password;
