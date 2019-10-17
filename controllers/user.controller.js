const { User } = require("../models");
const { Security } = require("../models");
const { Robot } = require("../models");
const Mailgun = require("mailgun-js");
const authService = require("../services/auth.service");
const { to, ReE, ReS } = require("../services/util.service");
const pug = require("pug");
const mailgun = require("mailgun-js");
const moment = require("moment");

const API_KEY = process.env.MAIL_GUN_API_KEY;
const DOMAIN = process.env.MAIL_GUN_DOMAIN;

// function register user
module.exports.register = async function(req, res) {
  const body = req.body;

  // user data
  let userData = {};
  userData.username = body.user.username;
  userData.email = body.user.email;
  userData.phone = body.user.phone;
  userData.register_date = moment().format("YYYY-MM-DD H:mm:ss");
  userData.status = "pending";
  userData.level = "1";
  userData.password = "8888";
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
  if (userData.phone.length < 11 || userData.phone.length > 12) {
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
  let users;

  [err, users] = await to(User.findAll({ raw: true }));

  return ReS(res, { users: users });
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

// email user registration
module.exports.userRegistrationEmail = async function(email) {
  const mg = mailgun({ apiKey: API_KEY, domain: DOMAIN });
  const data = {
    from: "Admin Robot Tumi <admin@robottradingsaham.com>",
    to: email,
    subject: "User Registration",
    html: pug.renderFile("./views/mail/user_registration.pug")
  };
  mg.messages().send(data, function(error, body) {});
};
