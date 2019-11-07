const { User } = require("../models");
const { Security } = require("../models");
const { Robot } = require("../models");
const { Master_Setting } = require("../models");
const { User_Setting } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

const moment = require("moment");

module.exports.run = async function(req, res) {
  const puppeteer = require("puppeteer");
  const Tesseract = require("../node_modules/tesseract.js");
  const fs = require("fs");

  const URL_login =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/login.jsp";
  const URL_protofolio =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/portfolio.jsp";
  const URL_runningTrade =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/runningTrade.jsp";

  let users = await getUsers();

  let thisUser = users[0];

  // return res.send(thisUser);

  let username = thisUser.security_user_id;
  let password = thisUser.password;
  let pin = thisUser.pin;

  /**
   * OPEN BROWSER
   */
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  /**
   * OPEN RHB PAGE
   */
  const page = await browser.newPage();
  await page.goto(URL_login);
  await page.waitFor(2000);

  /**
   * LOGIN RHB
   */
  await page.type("input[id='j_username']", username);
  await page.type("input[id='password']", password);

  await page.waitForSelector("img[alt='athentication token']");
  await page.evaluate(() => {
    document.querySelector(".form-login").style.backgroundColor = "white";
    document.querySelector("img[alt='athentication token']").style.transform =
      "scale(2.2) skew(-60deg, 5deg)";
    document.querySelector("img[alt='athentication token']").style.filter =
      "grayscale(1) brightness(3) contrast(10)";
  });

  let captcha = await page.$("img[alt='athentication token']");
  await captcha.screenshot({
    path: "./public/images/captcha/captcha.png",
    omitBackground: true
  });

  let tokenCaptcha = await Tesseract.recognize(
    "./public/images/captcha/captcha.png",
    "eng",
    {
      logger: m => console.log(m)
    }
  ).then(({ data: { text } }) => {
    token = text.replace(/\D+/g, "").trim();
    token.toString().substring(0, 4);
    return token;
  });

  console.log("token ", tokenCaptcha);

  await page.type("input[id='j_token']", tokenCaptcha);
  await page.click("button[type=submit]");

  /**
   * GET SETTING DATA FROM RHB
   */
  await page.goto(URL_protofolio);
  await page.waitFor(500);

  let cost_total = await page.evaluate(
    () => document.querySelector("div[id='_newOutstandingBalance']").innerHTML
  );

  thisUser.setting.cost_total = cost_total;

  let settings = await setSettings(thisUser.user_id, thisUser.setting);

  // return ReS(res, { setting: settings });

  let price_type = await settings.price_type;
  let stock_value_string = await settings.stock_value;
  let stock_value_data = await stock_value_string.split(",", 4);

  /**
   * LOGIN TRADING
   */
  await page.goto(URL_runningTrade);
  await page.click("button[onclick='objPopup.showLoginTrading();']");
  await page.type("input[id='_ltPin']", pin);
  await page.click("input[id='_ltEnter']");

  /**
   * AUTOMATION BUY
   */
  let i = 0;

  let exec = setInterval(async function() {
    if (i > 2) {
      clearInterval(exec);
    } else {
      console.log("i ", i);
      console.log("stock ", stock_value_data[i]);
      await stockBuy(page, price_type, stock_value_data[i]);
      console.log("finish");
    }

    i++;
  }, 5000);
};

async function stockBuy(page, price_type, stock) {
  await page.goto(
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?buy"
  );
  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(3000);

  let price = await getPrice(page, price_type);

  console.log("type ", price_type);
  console.log("price ", price);

  if (price != "" && price != "&nbsp;") {
    await page.type("input[id='_volume']", "1");
    await page.type("input[id='_price']", price);
    await page.click("button[id='_enter']");
    await page.click("button[id='_confirm']");
  }

  return await page.waitFor(5000);
}

// get Users
async function getUsers() {
  let userData, securityData, robotData;

  [err, userData] = await to(User.findAll({ raw: true }));
  [err, securityData] = await to(Security.findAll({ raw: true }));
  [err, robotData] = await to(Robot.findAll({ raw: true }));
  [err, m_setting_data] = await to(Master_Setting.findAll({ raw: true }));
  [err, u_setting_data] = await to(User_Setting.findAll({ raw: true }));

  let data = [];
  let config_name = "";

  robotData.forEach((rd, i) => {
    // get user
    let filter_user = userData.filter(ud => {
      return ud.id == rd.user_id;
    });
    // get security
    let filter_security = securityData.filter(sd => {
      return sd.id == rd.security_id;
    });
    // get setting
    let filter_setting = u_setting_data.filter(usd => {
      return usd.user_id == rd.user_id;
    });

    // filter setting
    let dataSetting = {};
    filter_setting.forEach(fs => {
      m_setting_data.forEach(msd => {
        if (msd.id == fs.master_setting_id) {
          config_name = msd.config_name;
        }
      });
      dataSetting[config_name] = fs.config_value;
    });

    data[i] = {
      user_id: filter_user[0].id,
      security_user_id: filter_security[0].username,
      username: filter_user[0].username,
      email: filter_user[0].email,
      phone: filter_user[0].phone,
      password: filter_security[0].password,
      pin: filter_security[0].pin,
      active_date: filter_security[0].active_date,
      expire_date: filter_security[0].expire_date,
      user_status: filter_user[0].status,
      robot_status: rd.status,
      setting: dataSetting
    };
  });

  let filter_data = data.filter(d => {
    return d.user_status == "active" && d.robot_status == "on";
  });

  return filter_data;
}

async function setSettings(user_id, settings) {
  let u_setting, m_setting, data, err;

  data = {
    cost_total: await settings.cost_total.replace(/,\s*/g, ""),
    fund_used: settings.fund_used,
    max_stock: settings.max_stock,
    dana_per_stock:
      ((await settings.cost_total.replace(/,\s*/g, "")) *
        (settings.fund_used / 100)) /
      settings.max_stock,
    level_per_stock: settings.level_per_stock,
    spread_per_level: settings.spread_per_level,
    profit_per_level: settings.profit_per_level,
    stock_mode: settings.stock_mode,
    stock_value: settings.stock_value,
    cl_value: settings.cl_value,
    cl_time: settings.cl_time,
    price_type: settings.price_type
  };

  let updateData = {};
  let element;

  // update data
  for (const i in await data) {
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

  return setting;
}

// get spesify price
async function getPrice(page, price_type) {
  let price;
  if (price_type == "open") {
    price = await getOpenPrice(page);
  } else {
    price = await getPrevPrice(page);
  }

  return price;
}

// get open price
async function getOpenPrice(page) {
  return await page.evaluate(
    () => document.querySelector("span[id='_open']").innerHTML
  );
}

// get prev price
async function getPrevPrice(page) {
  return await page.evaluate(
    () => document.querySelector("span[id='_prev']").innerHTML
  );
}
