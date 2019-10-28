const { Security } = require("../models");
const { Robot } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

// function create security
module.exports.create = async function(req, res) {
  let err, security;

  let security_info = req.body;

  [err, security] = await to(Security.create(security_info));
  if (err) return ReE(res, err, 422);

  return ReS(
    res,
    {
      message: "Sukses membuat sekuritas baru.",
      security: security.toWeb()
    },
    201
  );
};

// function get security by id
module.exports.get = async function(req, res) {
  let security, security_id, err;
  security_id = req.params.security_id;

  [err, security] = await to(Security.findOne({ where: { id: security_id } }));
  if (err) return ReE(res, "Sekuritas tidak ditemukan");
  if (!security)
    return ReE(res, "Sekuritas dengan id: " + security_id + " tidak ditemukan");

  return ReS(res, { security: security.toWeb() });
};

// function get security by user id
module.exports.getByUserId = async function(req, res) {
  let security, user_id, err, robot;
  user_id = req.params.user_id;

  [err, robot] = await to(Robot.findOne({ where: { user_id: user_id } }));
  if (err) return ReE(res, "Data robot tidak ditemukan");
  if (!robot)
    return ReE(
      res,
      "Data robot dengan id user: " + user_id + " tidak ditemukan"
    );

  [err, security] = await to(
    Security.findOne({ where: { id: robot.security_id } })
  );
  if (err) return ReE(res, "Sekuritas tidak ditemukan");
  if (!security)
    return ReE(res, "Sekuritas dengan id: " + security_id + " tidak ditemukan");

  return ReS(res, { security: security.toWeb() });
};

// function get securities
module.exports.getAll = async function(req, res) {
  let securities;

  [err, securities] = await to(Security.findAll({ raw: true }));

  return ReS(res, { securities: securities });
};

// function update security
module.exports.update = async function(req, res) {
  let security, security_id, data, err;
  security_id = req.params.security_id;

  data = req.body;

  [err, security] = await to(Security.findOne({ where: { id: security_id } }));
  if (err) return ReE(res, "Sekuritas tidak ditemukan");
  if (!security)
    return ReE(res, "Sekuritas dengan id: " + security_id + " tidak ditemukan");

  security.set(data);

  [err, security] = await to(security.save());
  if (err) {
    if (err.message == "Validation error") err = "Sekuritas Gagal diperbaharui";
    return ReE(res, err);
  }
  return ReS(res, { message: "Sekuritas diperbaharui" });
};

// function delete security
module.exports.remove = async function(req, res) {
  let security, security_id, err;
  security_id = req.params.security_id;

  [err, security] = await to(Security.findOne({ where: { id: security_id } }));
  if (err) return ReE(res, "Sekuritas tidak ditemukan");
  if (!security)
    return ReE(res, "Sekuritas dengan id: " + security_id + " tidak ditemukan");

  [err, security] = await to(security.destroy());
  if (err) return ReE(res, "Gagal menghapus Sekuritas");

  return ReS(res, { message: "Sekuritas terhapus" });
};
