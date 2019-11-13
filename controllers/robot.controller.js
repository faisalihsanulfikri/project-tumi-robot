const { Master_Setting } = require("../models");
const { Robot } = require("../models");
const { Security } = require("../models");
const { Stock_Sell } = require("../models");
const { User } = require("../models");
const { User_Setting } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

const puppeteer = require("puppeteer");
const Tesseract = require("../node_modules/tesseract.js");
const fs = require("fs");
const moment = require("moment");
const CronJob = require("cron").CronJob;

module.exports.run = async function(req, res) {
  const URL_login =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/login.jsp";
  const URL_protofolio =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/portfolio.jsp";
  const URL_runningTrade =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/runningTrade.jsp";

  let users = await getUsers();

  let thisUser = users[0];

  let username = thisUser.security_user_id;
  let password = thisUser.password;
  let pin = thisUser.pin;
  let user_id = thisUser.user_id;

  /**
   * OPEN BROWSER
   */
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
    // executablePath:
    //   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });

  /**
   * OPEN RHB PAGE
   */
  const page = await browser.newPage();
  await page.goto(URL_login);
  await page.waitFor(2000);

  // LOGIN RHB
  await login(page, username, password);

  // LOGIN TRADING
  await loginTrading(page, URL_runningTrade, pin);

  // GET SETTING DATA FROM RHB
  let settings = await getSettingData(page, URL_protofolio, thisUser);

  let price_type = await settings.price_type;
  let level_per_stock = parseInt(await settings.level_per_stock);
  let stock_value_string = await settings.stock_value;
  let stock_value_data = await stock_value_string.split(",", 4);

  // AUTOMATION INITIATION BUY
  // await automationInitBuys(page, price_type, level_per_stock, stock_value_data);

  // AUTOMATION
  // await automation(page);

  // SELL BY TIME
  // await selByTime(page);

  let transaction = await getTransaction(page);
  await page.waitFor(1000);

  // AUTOMATION SELL
  let openStockSells = await transaction.filter(el => {
    return el.mode == "Sell" && el.status == "Open";
  });

  // get open stock
  let stockOpen = await transaction.filter(el => {
    return el.status == "Open";
  });

  if (stockOpen.length > 0) {
    // set index into every element
    let mapWithdrawStockSell = stockOpen.map((el, i) => {
      return {
        ...el,
        index: i
      };
    });

    // filter sell transaction
    let withdrawStockSellData = mapWithdrawStockSell.filter(el => {
      return el.mode == "Buy";
    });

    if (withdrawStockSellData.length > 0) {
      await automationWithdrawStockSell(page, withdrawStockSellData);
    }

    // if (openStockSells.length > 0) {
    //   await automationSellByTimes(page, openStockSells, user_id);
    // }
  }

  return;
};

// automation sells
async function automationSells(page, matchStockBuys, user_id) {
  let dataStockSell = await matchStockBuys.map(el => {
    return {
      order_id: el.order_id,
      user_id: user_id,
      stock: el.stock,
      mode: el.mode,
      status: el.status,
      priceBuy: el.price,
      priceSell: (parseInt(el.price) + 1).toString(),
      createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
      updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
    };
  });

  // set data stock sell
  await setStockSell(await dataStockSell);
  let getDataStockSell = await getStockSell();
  await page.waitFor(5000);

  let stocksSell = [];

  for (let i = 0; i < (await getDataStockSell.length); i++) {
    stocksSell.push(await stockSell(page, await getDataStockSell[i]));
    await updateStockTransaction(await getDataStockSell[i]);
  }

  // run sell stock
  Promise.all(stocksSell).then(() => {
    console.log("stocksSell finish!!!");
  });
}

// automation sells
async function automationSellByTimes(page, openStockSells, user_id) {
  let dataStockSellByTime = await openStockSells.map(el => {
    return {
      order_id: el.order_id,
      user_id: user_id,
      stock: el.stock,
      mode: el.mode,
      status: el.status,
      priceBuy: el.price,
      priceSell: (parseInt(el.price) + 1).toString(),
      createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
      updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
    };
  });

  // set data stock sell by time
  await setStockSell(await dataStockSellByTime);
  let getDataStockSellByTime = await getStockSellByTime();
  await page.waitFor(5000);

  let stocksSellByTime = [];

  for (let i = 0; i < (await getDataStockSellByTime.length); i++) {
    stocksSellByTime.push(
      await stockSellByTime(page, await getDataStockSellByTime[i])
    );
    await updateStockTransaction(await getDataStockSellByTime[i]);
  }

  // run sell stock
  Promise.all(stocksSellByTime).then(() => {
    console.log("stocksSellByTime finish!!!");
  });
}

// automation withdraw stock sell
async function automationWithdrawStockSell(page, withdrawData) {
  let withdrawStockSell = [];

  for (let i = 0; i < (await withdrawData.length); i++) {
    withdrawStockSell.push(
      await setWithdrawStockSell(page, await withdrawData[i])
    );
  }

  // run withdraw stock
  Promise.all(withdrawStockSell).then(() => {
    console.log("withdrawStockSell finish!!!");
  });
}

// automation buys
async function automationBuys(page, matchStockSells, user_id) {
  let dataStockBuy = await matchStockSells.map(el => {
    return {
      order_id: el.order_id,
      user_id: user_id,
      stock: el.stock,
      mode: el.mode,
      status: el.status,
      priceBuy: el.price,
      priceSell: (parseInt(el.price) + 1).toString(),
      createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
      updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
    };
  });

  // set data stock buy
  await setStockBuy(await dataStockBuy);
  let getDataStockBuy = await getStockBuy();
  await page.waitFor(5000);

  let stocksBuy = [];

  for (let i = 0; i < (await getDataStockBuy.length); i++) {
    stocksBuy.push(await stockBuy(page, await getDataStockBuy[i]));
    await updateStockTransaction(await getDataStockBuy[i]);
  }

  // run buy stock
  Promise.all(stocksBuy).then(() => {
    console.log("stocksBuy finish!!!");
  });
}

// automation initiation buys
async function automationInitBuys(
  page,
  price_type,
  level_per_stock,
  stock_value_data
) {
  let stocksInitBuy = [];
  for (let i = 0; i < stock_value_data.length; i++) {
    for (let idx = 0; idx < level_per_stock; idx++) {
      stocksInitBuy.push(
        await stockInitBuy(
          page,
          price_type,
          level_per_stock,
          stock_value_data[i],
          idx
        )
      );
    }
  }

  // run initiation buy stock
  Promise.all(stocksInitBuy).then(() => {
    console.log("finish initiation buy!!!");
  });
}

// automation
async function automation(page) {
  const job = new CronJob("*/59 * * * * *", async function() {
    // TRANSACTION
    let transaction = await getTransaction(page);
    await page.waitFor(1000);

    // AUTOMATION SELL
    let matchStockBuys = await transaction.filter(el => {
      return el.mode == "Buy" && el.status == "Matched";
    });
    if (matchStockBuys.length > 0) {
      await automationSells(page, matchStockBuys, user_id);
    }

    // AUTOMATION BUY
    let matchStockSells = await transaction.filter(el => {
      return el.mode == "Sell" && el.status == "Matched";
    });
    if (matchStockSells.length > 0) {
      await automationBuys(page, matchStockSells, user_id);
    }
  });

  job.start();
}

// set init buy stocks
async function stockInitBuy(page, price_type, level, stock, i) {
  const URL_orderpad_buy =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?buy";

  console.log("stock ", stock);
  await page.goto(URL_orderpad_buy);
  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(4000);

  let price = await getBuyPrice(page, price_type, level);

  console.log("type ", price_type);

  if (price[i] != "NaN") {
    if (parseInt(price[i]) >= 50) {
      await page.type("input[id='_volume']", "1");
      await page.type("input[id='_price']", price[i]);
      await page.click("button[id='_enter']");
      await page.waitFor(1000);
      await page.click("button[id='_confirm']");
      await page.waitFor(1000);
      console.log("=-=-=-=-=BUY=-=-=-=-=", parseInt(price[i]));
    }
  }

  console.log("price ", await price);
  console.log("price[] ", await price[i]);
  console.log("finish");
  console.log("##############################################");

  return await page.waitFor(1000);
}

// set sell stocks
async function stockSell(page, dataStockSell) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";
  let stock = dataStockSell.stock;
  let priceSell = dataStockSell.priceSell;
  let priceBuy = dataStockSell.priceBuy;
  let lots = dataStockSell.lots;

  console.log("stock ", stock);
  console.log("priceBuy ", priceBuy);
  console.log("priceSell ", priceSell);

  await page.goto(URL_orderpad_sell);

  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(3000);

  await page.type("input[id='_volume']", "1");
  await page.type("input[id='_price']", priceSell);
  await page.click("button[id='_enter']");
  await page.waitFor(1000);
  await page.click("button[id='_confirm']");
  await page.waitFor(1000);
  console.log("=-=-=-=-=SELL=-=-=-=-=", priceSell);

  console.log("finish");
  console.log("#############################################S");

  return await page.waitFor(1000);
}

// set sell by time stocks
async function stockSellByTime(page, dataStockSell) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";
  let stock = dataStockSell.stock;

  console.log("stock ", stock);

  await page.goto(URL_orderpad_sell);

  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(3000);

  let bidPrice = await getBidPrice(page);

  console.log("type ", bidPrice);

  if (bidPrice != "&nbsp;") {
    await page.type("input[id='_volume']", "1");
    await page.type("input[id='_price']", bidPrice);
    await page.click("button[id='_enter']");
    await page.waitFor(1000);
    await page.click("button[id='_confirm']");
    await page.waitFor(1000);
    console.log("=-=-=-=-=SELL BY TIME=-=-=-=-=", bidPrice);
  }

  console.log("finish");
  console.log("#############################################S");

  return await page.waitFor(1000);
}

// set buy stock
async function stockBuy(page, dataStockBuy) {
  const URL_orderpad_buy =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?buy";

  let stock = dataStockBuy.stock;
  let priceSell = dataStockBuy.priceSell;
  let priceBuy = dataStockBuy.priceBuy;
  let lots = dataStockBuy.lots;

  console.log("stock ", stock);
  console.log("priceBuy ", priceBuy);
  console.log("priceSell ", priceSell);

  await page.goto(URL_orderpad_buy);
  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(4000);

  await page.type("input[id='_volume']", "1");
  await page.type("input[id='_price']", priceBuy);
  await page.click("button[id='_enter']");
  await page.waitFor(1000);
  await page.click("button[id='_confirm']");
  await page.waitFor(1000);
  console.log("=-=-=-=-=BUY=-=-=-=-=", priceBuy);

  console.log("finish");
  console.log("##############################################");

  return await page.waitFor(1000);
}

// get transactions
async function getTransaction(page) {
  await page.goto(
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp"
  );

  await page.waitFor(1000);

  try {
    await page.waitFor(1000);
    const data = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        let table = document.querySelector("#_orderTable");
        let row = table.children;
        let items = [];

        for (let index = 0; index < row.length; index++) {
          let result = {};

          for (let i = 0; i < row[index].cells.length; i++) {
            result["order_time"] = row[index].cells[1].textContent;
            result["order_id"] = row[index].cells[2].textContent;
            result["market"] = row[index].cells[3].textContent;
            result["mode"] = row[index].cells[4].textContent;
            result["stock"] = row[index].cells[5].textContent;
            result["price"] = row[index].cells[6].textContent;
            result["remain"] = row[index].cells[7].textContent;
            result["match"] = row[index].cells[8].textContent;
            result["status"] = row[index].cells[9].textContent;
            if (result["status"] == "Open") {
              result["lots"] = result["remain"];
            } else if (result["status"] == "Matched") {
              result["lots"] = result["match"];
            }
            result["order_amount"] = row[index].cells[10].textContent;
            result["match_amount"] = row[index].cells[11].textContent;
            result["validity"] = row[index].cells[12].textContent;
            result["channel"] = row[index].cells[13].textContent;
            result["user_id"] = "3";
          }

          items.push(result);
        }

        resolve(items);
      });
    });
    console.log("inner function ", data);
    return data;
  } catch (err) {
    return err;
  }
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

  return Promise.resolve(filter_data);
}

// set stock sell
async function setStockSell(stockData) {
  let err, stockSell;

  stockData.forEach(async el => {
    [err, stockSell] = await to(
      Stock_Sell.findOne({ where: { order_id: el.order_id } })
    );
    if (!stockSell) {
      console.log(el);
      [err, stockSell] = await to(Stock_Sell.create(el));
    } else {
      stockSell.set(el);
      [err, stockSell] = await to(stockSell.save());
    }
  });
}

// get stock buy
async function getStockSell() {
  let err, stockSell;

  [err, stockSell] = await to(
    Stock_Sell.findAll({
      where: {
        mode: "Buy",
        status: "Matched",
        on_sale: "no"
      }
    })
  );

  return stockSell;
}

// get stock buy
async function getStockSellByTime() {
  let err, stockSell;

  [err, stockSell] = await to(
    Stock_Sell.findAll({
      where: {
        mode: "Sell",
        status: "open",
        on_sale: "no"
      }
    })
  );

  return stockSell;
}

// set stock buy
async function setStockBuy(stockData) {
  let err, stockBuy;

  stockData.forEach(async el => {
    [err, stockBuy] = await to(
      Stock_Sell.findOne({ where: { order_id: el.order_id } })
    );
    if (!stockBuy) {
      console.log(el);
      [err, stockBuy] = await to(Stock_Sell.create(el));
    } else {
      stockBuy.set(el);
      [err, stockBuy] = await to(stockBuy.save());
    }
  });
}

// get stock buy
async function getStockBuy() {
  let err, stockBuy;

  [err, stockBuy] = await to(
    Stock_Sell.findAll({
      where: {
        mode: "Sell",
        status: "Matched",
        on_sale: "no"
      }
    })
  );

  return stockBuy;
}

// set withdraw stock sell
async function setWithdrawStockSell(page, withdrawData) {
  const URL_orderstatus =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp";

  await page.goto(URL_orderstatus);
  await page.waitFor(2000);

  await page.click("img[onclick='objPopup.showPopupWithdraw(0);']");
  await page.waitFor(1500);
  await page.click("input[onclick='objPopup.doPopupWithdraw();']");
  await page.waitFor(1500);
  // await page.keyboard.press(String.fromCharCode(13));
  await page.keyboard.press("Enter");
  await page.waitFor(2000);
}

// update on sale stock
async function updateStockTransaction(stockData) {
  let err, stockSell;

  let updateData = {
    on_sale: "yes",
    updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
  };

  [err, stockSell] = await to(
    Stock_Sell.findOne({ where: { order_id: stockData.order_id } })
  );

  stockSell.set(updateData);
  [err, stockSell] = await to(stockSell.save());
}

// set Users settings
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

// get spesify bid price
async function getBidPrice(page) {
  return await page.evaluate(
    () => document.querySelector("td[id='_bidVal0']").innerHTML
  );
}

// get spesify buy price
async function getBuyPrice(page, price_type, level) {
  let price;
  let dataPrice = [];
  if (price_type == "open") {
    price = await getOpenPrice(page);
  } else if (price_type == "prev") {
    price = await getPrevClosePrice(page);
  } else {
    price = await getClosePrice(page);
  }

  dataPrice[0] = parseInt(await price);

  // spread price by level per stock
  for (let i = 1; i < level; i++) {
    dataPrice[i] = dataPrice[i - 1] - 1;
  }

  for (let i = 0; i < level; i++) {
    dataPrice[i] = dataPrice[i].toString();
  }

  return dataPrice;
}

// get open price
async function getOpenPrice(page) {
  return await page.evaluate(
    () => document.querySelector("span[id='_open']").innerHTML
  );
}

// get prev close price
async function getPrevClosePrice(page) {
  return await page.evaluate(
    () => document.querySelector("span[id='_prev']").innerHTML
  );
}

// get close price
async function getClosePrice(page) {
  return await page.evaluate(
    () => document.querySelector("td[id='_last']").innerHTML
  );
}

// login
async function login(page, username, password) {
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
}

// login trading
async function loginTrading(page, URL_runningTrade, pin) {
  await page.goto(URL_runningTrade);
  await page.click("button[onclick='objPopup.showLoginTrading();']");
  await page.type("input[id='_ltPin']", pin);
  await page.click("input[id='_ltEnter']");
}

// get setting data
async function getSettingData(page, URL_protofolio, thisUser) {
  await page.goto(URL_protofolio);
  await page.waitFor(1000);

  let cost_total = await page.evaluate(
    () => document.querySelector("div[id='_newOutstandingBalance']").innerHTML
  );

  thisUser.setting.cost_total = cost_total;

  let settings = await setSettings(thisUser.user_id, thisUser.setting);

  return await settings;
}
