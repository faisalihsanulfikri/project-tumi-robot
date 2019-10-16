const { User } = require("../models");
const authService = require("../services/auth.service");
const { to, ReE, ReS } = require("../services/util.service");

// function register user
const register = async function(req, res) {
  const body = req.body;

  body.active = "0";
  body.level = "1";
  body.password = "8888";

  if (!body.unique_key && !body.email) {
    return ReE(res, "Please enter an email to register.", 422);
  } else if (!body.phone) {
    return ReE(res, "Please enter a phone number to register.", 422);
  } else if (!body.password) {
    return ReE(res, "Please enter a password to register.", 422);
  } else {
    let err, user;

    [err, user] = await to(authService.createUser(body));

    if (err) return ReE(res, err, 422);
    return ReS(
      res,
      {
        message: "Successfully created new user.",
        user: user.toWeb(),
        token: user.getJWT()
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

const change_password = async function(req, res){
    let user, data, user_id, err;
    user_id = req.params.user_id;
    
    data = req.body;

    [err, user] = await to(User.findOne({ where: { id: user_id } }));
    if (err) return ReE(res, "err finding user");
    if (!user) return ReE(res, "user not found with id: " + user_id);

    user.set(data);

    [err, user] = await to(user.save());
    return ReS(res, {message :'change Password: '+user.password});
}
module.exports.change_password = change_password;