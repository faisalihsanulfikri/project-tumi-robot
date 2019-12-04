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
