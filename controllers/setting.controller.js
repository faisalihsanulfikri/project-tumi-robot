const { Master_Setting } = require("../models");
const { User_Setting } = require("../models");
const { User } = require("../models");
const { Robot } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

const moment = require("moment");

// function create setting
module.exports.create = async function(req, res) {
  let user, u_setting, m_setting, user_id, data, err;
  user_id = req.params.user_id;
  data = req.body;

  // validasi user
  [err, user] = await to(User.findOne({ where: { id: user_id } }));
  if (err) return ReE(res, "User tidak ditemukan", 422);
  if (!user)
    return ReE(res, "User dengan id: " + user_id + " tidak ditemukan", 422);

  // validate payload
  let settingElement = {};
  [err, m_setting] = await to(Master_Setting.findAll({ raw: true }));
  m_setting.forEach(async (el, i) => {
    settingElement[el.config_name] = el.config_value;
  });

  let settingValidate = true;

  for (const key in settingElement) {
    settingValidate = data.hasOwnProperty(key);
    if (!settingValidate) {
      return ReE(res, "Data setting " + key + " tidak ada", 422);
    }
  }
  // end validate payload

  let setData = {};
  let element;

  // set data
  for (const i in data) {
    element = i;

    // get master id setting
    [err, m_setting] = await to(
      Master_Setting.findOne({
        where: { config_name: element }
      })
    );

    // set data
    setData = {
      master_setting_id: m_setting.id,
      config_value: data[i],
      user_id: user_id,
      createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
      updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
    };

    // set data user setting
    [err, u_setting] = await to(User_Setting.create(setData));
  }
  // end set data

  [err, u_setting] = await to(
    User_Setting.findAll({
      where: { user_id: user_id }
    })
  );

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
  let u_setting_data, usersData, m_setting_data, robotData;

  [err, usersData] = await to(User.findAll({ raw: true }));
  [err, m_setting_data] = await to(Master_Setting.findAll({ raw: true }));
  [err, u_setting_data] = await to(User_Setting.findAll({ raw: true }));
  [err, robotData] = await to(Robot.findAll({ raw: true }));

  let settings = [];
  let config_name = "";
  let activate = "";

  usersData.forEach((ud, i) => {
    let filter_setting = u_setting_data.filter(el => {
      return el.user_id == ud.id;
    });

    // ud.id == 1 => id admin
    if (ud.id > 1) {
      let filter_robot = robotData.filter(el => {
        return el.user_id == ud.id;
      });
      activate = filter_robot[0].status;
    }

    let dataSetting = {};
    filter_setting.forEach(fs => {
      m_setting_data.forEach(msd => {
        if (msd.id == fs.master_setting_id) {
          config_name = msd.config_name;
        }
      });
      dataSetting[config_name] = fs.config_value;
    });

    let dataUser = {
      id: ud.id,
      username: ud.username
    };

    settings[i] = {
      user: dataUser,
      setting: dataSetting,
      activate: activate
    };
  });

  return ReS(res, { settings: settings });
};

// function update setting
module.exports.update = async function(req, res) {
  let u_setting, m_setting, user_id, data, err;
  user_id = req.params.user_id;
  data = req.body;

  // validate payload
  let settingElement = {};
  [err, m_setting] = await to(Master_Setting.findAll({ raw: true }));
  m_setting.forEach(async (el, i) => {
    settingElement[el.config_name] = el.config_value;
  });

  let settingValidate = true;

  for (const key in settingElement) {
    settingValidate = data.hasOwnProperty(key);
    if (!settingValidate) {
      return ReE(res, "Data setting " + key + " tidak ada", 422);
    }
  }
  // end validate payload

  let updateData = {};
  let element;

  // update data
  for (const i in data) {
    element = i;
    updateData = {
      config_value: data[i],
      updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
    };

    // get master id setting
    [err, m_setting] = await to(
      Master_Setting.findOne({
        where: { config_name: element }
      })
    );

    // get data user setting
    [err, u_setting] = await to(
      User_Setting.findOne({
        where: { user_id: user_id, master_setting_id: m_setting.id }
      })
    );
    if (!u_setting)
      return ReE(
        res,
        "Setting " +
          element +
          " dengan user_id: " +
          user_id +
          " tidak ditemukan"
      );

    // update data user setting
    u_setting.set(updateData);
    [err, u_setting] = await to(u_setting.save());
  }
  // end update data

  [err, u_setting] = await to(
    User_Setting.findAll({
      where: { user_id: user_id }
    })
  );

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

// function delete setting
module.exports.remove = async function(req, res) {
  let u_setting, m_setting, user_id, err;
  user_id = req.params.user_id;

  [err, u_setting] = await to(
    User_Setting.findOne({ where: { user_id: user_id } })
  );

  if (err) return ReE(res, "Setting tidak ditemukan");
  if (!u_setting)
    return ReE(res, "Setting dengan id user: " + user_id + " tidak ditemukan");

  [err, u_setting] = await to(
    User_Setting.destroy({ where: { user_id: user_id } })
  );

  if (err) return ReE(res, "Gagal menghapus Setting");

  return ReS(res, { message: "Setting terhapus" });
};
