const { User } = require("../models");
const { Security } = require("../models");
const { Robot } = require("../models");
const authService = require("../services/auth.service");
const { to, ReE, ReS } = require("../services/util.service");

// function register user
const register = async function(req, res) {
  const body = req.body;
  let userData = {};

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

  userData.username = body.user.username;
  userData.email = body.user.email;
  userData.phone = body.user.phone;
  userData.register_date = date;
  userData.status = "pending";
  userData.level = "1";
  userData.password = "8888";

  if (!userData.unique_key && !userData.email) {
    return ReE(res, "Please enter an email to register.", 422);
  } else if (!userData.phone) {
    return ReE(res, "Please enter a phone number to register.", 422);
  } else if (!userData.password) {
    return ReE(res, "Please enter a password to register.", 422);
  } else {
    let err, user;

    [err, user] = await to(authService.createUser(userData));

    if (err) return ReE(res, err, 422);

    let securityData = {};
    securityData.username = body.security.username;
    securityData.password = body.security.password;
    securityData.pin = body.security.pin;

    [err, security] = await to(Security.create(securityData));
    if (err) return ReE(res, err, 422);

    let robotData = {};
    robotData.user_id = user.id;
    robotData.security_id = security.id;
    robotData.status = "off";

    [err, robot] = await to(Robot.create(robotData));
    if (err) return ReE(res, err, 422);

    return ReS(
      res,
      {
        message: "Successfully created new user.",
        user: user.toWeb(),
        access_token: user.getJWT()
      },
      201
    );
  }
};
module.exports.register = register;

// function login user
const login = async function(req, res) {
  const body = req.body;
  let err, user;

  [err, user] = await to(authService.authUser(body));
  if (err) return ReE(res, err, 422);

  return ReS(res, { access_token: user.getJWT(), user: user.toWeb() });
};
module.exports.login = login;

// function get user by id
const get = async function(req, res) {
  let user, user_id, err;
  user_id = req.params.user_id;

  [err, user] = await to(User.findOne({ where: { id: user_id } }));
  if (err) return ReE(res, "err finding user", 422);
  if (!user) return ReE(res, "user not found with id: " + user_id, 422);

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
  if (err) return ReE(res, "err finding user", 422);
  if (!user) return ReE(res, "user not found with id: " + user_id, 422);

  user.set(data);

  [err, user] = await to(user.save());
  if (err) {
    if (err.message == "Validation error")
      err = "The email address or phone number is already in use";
    return ReE(res, err, 422);
  }
  return ReS(res, { message: "Updated User: " + user.email });
};
module.exports.update = update;

// function remove user
const remove = async function(req, res) {
  let user, user_id, err;
  user_id = req.params.user_id;

  [err, user] = await to(User.findOne({ where: { id: user_id } }));
  if (err) return ReE(res, "err finding user", 422);
  if (!user) return ReE(res, "user not found with id: " + user_id, 422);

  [err, user] = await to(user.destroy());
  if (err) return ReE(res, "error occured trying to delete user", 422);

  return ReS(res, { message: "Deleted User" });
};
module.exports.remove = remove;
