const { Master_Setting } = require("../models");
const { User_Setting } = require("../models");
const { User } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

// function create setting
module.exports.create = async function(req, res) {
  // let err, security;
  // let security_info = req.body;
  // [err, security] = await to(Security.create(security_info));
  // if (err) return ReE(res, err, 422);
  // return ReS(
  //   res,
  //   {
  //     message: "Sukses membuat sekuritas baru.",
  //     security: security.toWeb()
  //   },
  //   201
  // );
};

// function get setting by id
module.exports.get = async function(req, res) {
  // let setting, setting_id, err;
  // setting_id = req.params.setting_id;
  // [err, setting] = await to(
  //   master_setting.findOne({ where: { id: setting_id } })
  // );
  // if (err) return ReE(res, "Sekuritas tidak ditemukan");
  // if (!setting)
  //   return ReE(res, "Sekuritas dengan id: " + setting_id + " tidak ditemukan");
  // setting.config_value = JSON.parse(setting.config_value);
  // return ReS(res, { setting: setting.toWeb() });
};

// function get setting by user id
module.exports.getByUserId = async function(req, res) {
  let u_setting, user_id, err, m_setting;
  user_id = req.params.user_id;

  [err, u_setting] = await to(
    User_Setting.findAll({ where: { user_id: user_id } })
  );
  if (err) return ReE(res, "Setting tidak ditemukan");
  if (!u_setting)
    return ReE(res, "Setting dengan id user: " + user_id + " tidak ditemukan");

  [err, m_setting] = await to(Master_Setting.findAll({ raw: true }));

  let setting = {};
  let config_name = "";

  u_setting.forEach(async (el, i) => {
    m_setting.forEach(ms => {
      if (ms.id == el.master_setting_id) {
        config_name = ms.config_name;
      }
    });
    setting[config_name] = el.config_value;
  });

  return ReS(res, { setting: setting });
};

// function get settings
module.exports.getAll = async function(req, res) {
  let u_setting_data, usersData, m_setting_data;

  [err, usersData] = await to(User.findAll({ raw: true }));
  [err, m_setting_data] = await to(Master_Setting.findAll({ raw: true }));
  [err, u_setting_data] = await to(User_Setting.findAll({ raw: true }));

  let settings = [];
  let config_name = "";

  usersData.forEach((ud, i) => {
    let filter_setting = u_setting_data.filter(el => {
      return el.user_id == ud.id;
    });

    let dataSetting = {};
    filter_setting.forEach(fs => {
      m_setting_data.forEach(msd => {
        if (msd.id == fs.master_setting_id) {
          config_name = msd.config_name;
        }
      });
      dataSetting[config_name] = fs.config_value;
    });

    settings[i] = {
      user_id: ud.id,
      setting: dataSetting
    };
  });

  return ReS(res, { settings: settings });
};

// function update setting
module.exports.update = async function(req, res) {
  // let security, security_id, data, err;
  // security_id = req.params.security_id;
  // data = req.body;
  // [err, security] = await to(Security.findOne({ where: { id: security_id } }));
  // if (err) return ReE(res, "Sekuritas tidak ditemukan");
  // if (!security)
  //   return ReE(res, "Sekuritas dengan id: " + security_id + " tidak ditemukan");
  // security.set(data);
  // [err, security] = await to(security.save());
  // if (err) {
  //   if (err.message == "Validation error") err = "Sekuritas Gagal diperbaharui";
  //   return ReE(res, err);
  // }
  // return ReS(res, { message: "Sekuritas diperbaharui" });
};

// function delete setting
module.exports.remove = async function(req, res) {
  // let security, security_id, err;
  // security_id = req.params.security_id;
  // [err, security] = await to(Security.findOne({ where: { id: security_id } }));
  // if (err) return ReE(res, "Sekuritas tidak ditemukan");
  // if (!security)
  //   return ReE(res, "Sekuritas dengan id: " + security_id + " tidak ditemukan");
  // [err, security] = await to(security.destroy());
  // if (err) return ReE(res, "Gagal menghapus Sekuritas");
  // return ReS(res, { message: "User terhapus" });
};
