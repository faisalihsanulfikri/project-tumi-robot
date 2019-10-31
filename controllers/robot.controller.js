const { User } = require("../models");
const { Security } = require("../models");
const { Robot } = require("../models");
const { Master_Setting } = require("../models");
const { User_Setting } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

module.exports.run = async function(req, res) {
  const puppeteer = require("puppeteer");
  const Tesseract = require("../node_modules/tesseract.js");
  const fs = require("fs");

  let users = await getUsers();

  let thisUser = users[0];

  // return res.send(thisUser.setting.price_type);

  let username = thisUser.security_user_id;
  let password = thisUser.password;
  let pin = thisUser.pin;
  let price_type = thisUser.setting.price_type;
  let stock_value_string = thisUser.setting.stock_value;
  let stock_value_data = stock_value_string.split(",", 4);

  // let i = 0;

  // let exec = setInterval(function(params) {
  //   console.log(stock_value_data[i]);

  //   // await stockBuy(page, price_type, stock_value_data[i]);
  //   i++;
  //   if (i > 2) {
  //     clearInterval(exec);
  //   }
  // }, 5000);

  // return;

  // return res.send(data);

  // open browser
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  const URL = "https://webtrade.rhbtradesmart.co.id/onlineTrading/login.jsp";
  const page = await browser.newPage();

  // open rhb page
  await page.goto(URL);
  await page.waitFor(2000);

  // login rhb
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

  // login trading
  await page.goto(
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/runningTrade.jsp"
  );
  await page.click("button[onclick='objPopup.showLoginTrading();']");
  await page.type("input[id='_ltPin']", pin);
  await page.click("input[id='_ltEnter']");

  // automation buy

  let i = 0;

  let exec = setInterval(async function(params) {
    await stockBuy(page, price_type, stock_value_data[i]);
    console.log(stock_value_data[i]);

    i++;
    if (i > 2) {
      clearInterval(exec);
    }
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
      security_user_id: filter_security[0].username,
      username: filter_user[0].username,
      email: filter_user[0].email,
      phone: filter_user[0].phone,
      password: filter_security[0].password,
      pin: filter_security[0].pin,
      active_date: filter_security[0].active_date,
      expire_date: filter_security[0].expire_date,
      status: filter_user[0].status,
      setting: dataSetting
    };
  });

  let filter_data = data.filter(d => {
    return d.status == "active";
  });

  console.log(filter_data);
  return filter_data;
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
