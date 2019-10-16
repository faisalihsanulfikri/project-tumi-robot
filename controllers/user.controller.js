const { User } = require("../models");
const { Security } = require("../models");
const { Robot } = require("../models");
const Mailgun = require("mailgun-js");
const authService = require("../services/auth.service");
const { to, ReE, ReS } = require("../services/util.service");

// function register user
const register = async function(req, res) {
  const body = req.body;

  // date
  let d = new Date();
  let month = d.getMonth() + 1;
  let day = d.getDate();
  let year = d.getFullYear();
  let hour = d.getHours();
  let minute = d.getMinutes();
  let second = d.getSeconds();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  let date =
    year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;

  // user data
  let userData = {};
  userData.username = body.user.username;
  userData.email = body.user.email;
  userData.phone = body.user.phone;
  userData.register_date = date;
  userData.status = "pending";
  userData.level = "1";
  userData.password = "8888";

  // security data
  let securityData = {};
  securityData.username = body.security.username;
  securityData.password = body.security.password;
  securityData.pin = body.security.pin;

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

  [err, robot] = await to(Robot.create(robotData));
  if (err) return ReE(res, err, 422);

  return ReS(
    res,
    {
      message: "Berhasil membuat akun baru. Silakan mengecek email anda."
    },
    201
  );
};
module.exports.register = register;

// function login user
const login = async function(req, res) {
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
module.exports.login = login;

// function get user by id
const get = async function(req, res) {
  let user, user_id, err;
  user_id = req.params.user_id;

  [err, user] = await to(User.findOne({ where: { id: user_id } }));
  if (err) return ReE(res, "User tidak ditemukan", 422);
  if (!user)
    return ReE(res, "User dengan id: " + user_id + " tidak ditemukan", 422);

  return ReS(res, { user: user.toWeb() });
};
module.exports.get = get;

// function get user all
const getAll = async function(req, res) {
  let users;

  [err, users] = await to(User.findAll({ raw: true }));

  return ReS(res, { users: users });
};
module.exports.getAll = getAll;

// function update user
const update = async function(req, res) {
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
module.exports.update = update;

// function remove user
const remove = async function(req, res) {
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
module.exports.remove = remove;

const email = async function(req, res) {
  let api_key = process.env.MAIL_GUN_API_KEY;
  let domain = process.env.MAIL_GUN_DOMAIN;
  let tumi_email = process.env.MAIL_GUN_MAIL;

  let mailgun = new Mailgun({ apiKey: api_key, domain: domain });
  let data = {
    from: tumi_email,
    to: "faisalihsanulfikri.gmail.com",
    subject: "Hello from Mailgun",
    html:
      "Hello, This is not a plain-text email, I wanted to test some spicy Mailgun sauce in NodeJS!"
  };

  mailgun.messages().send(data, function(err, body) {
    if (err) {
      ReS(res, {
        error: err
      });

      console.log("got an error: ", err);
    } else {
      ReS(res, {
        email: "faisalihsanulfikri.gmail.com"
      });

      console.log(body);
    }
  });
};
module.exports.email = email;
