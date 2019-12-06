const { Init_Buy } = require("../models");
const { Master_Setting } = require("../models");
const { Portofolios } = require("../models");
const { Portofolio_stocks } = require("../models");
const { Robot } = require("../models");
const { Security } = require("../models");
const { Sell_Times } = require("../models");
const { Stock_Sell } = require("../models");
const { Transaction } = require("../models");
const { User } = require("../models");
const { User_Setting } = require("../models");
const { User_Withdraw } = require("../models");
const { Withdraw } = require("../models");
const { Stock_rangking } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

const puppeteer = require("puppeteer");
const Tesseract = require("../node_modules/tesseract.js");
const fs = require("fs");
const moment = require("moment");
const CronJob = require("cron").CronJob;

require("dotenv").config();

let globalIndex = 0;

module.exports.run = async function(req, res) {
  let robot_id = req.params.robot_id;
  const URL_login =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/login.jsp";
  const URL_protofolio =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/portfolio.jsp";
  const URL_runningTrade =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/runningTrade.jsp";
  const URL_accountinfo =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/accountinfo.jsp";

  let thisUser = await getUsers(robot_id);

  let name = thisUser.username;
  let username = thisUser.security_user_id;
  let password = thisUser.password;
  let pin = thisUser.pin;
  let user_id = thisUser.user_id;

  /** TEST */

  /** END TEST */

  console.log("Robot " + robot_id + " - " + name);

  /**
   * OPEN BROWSER
   */
  let getHeadless;
  process.env.CHROMIUM_HEADLESS == "true"
    ? (getHeadless = true)
    : (getHeadless = false);

  const browser = await puppeteer.launch({
    headless: getHeadless,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
    // executablePath:
    //   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });

  /**
   * OPEN RHB PAGE
   */
  const page = await browser.newPage();

  page.on("dialog", async dialog => {
    await dialog.accept();
  });

  await page.goto(URL_login);
  await page.waitFor(2000);

  // LOGIN RHB
  await login(page, username, password, robot_id);
  await setOnRobotStatus(robot_id);

  // LOGIN TRADING
  await loginTrading(page, URL_runningTrade, pin);

  // GET SETTING DATA
  let settings = await getSettingData(user_id);
  let lastInit = await getLastInitBuysSells(user_id);

  // GET SETTING DATA IF SELL BY TIME IS TRUE
  if (settings.is_sell_by_time == "true" || lastInit.length == 0) {
    settings = await getUpdateSettingData(page, URL_protofolio, thisUser);
  }

  let price_type = await settings.price_type;
  let level_per_stock = parseInt(await settings.level_per_stock);
  let stock_value_string = await settings.stock_value;
  let stock_value_data = await stock_value_string.split(",", 4);
  let cost_total = await settings.cost_total;
  let dana_per_stock = await settings.dana_per_stock;
  let spreadPerLevel = await settings.spread_per_level;
  let profitPerLevel = await settings.profit_per_level;
  let clValue = await settings.cl_value;

  /** TEST */

  /** END TEST */

  /** START */

  // validate buy time
  const isMoreThanBuyTime = new CronJob("*/30 * * * * *", async function() {
    let now = moment().format("HH:mm:ss");
    let getBuyTime = moment(settings.buy_time, "HH:mm:ss");
    let buy_time = moment(getBuyTime).format("HH:mm:ss");

    console.log("now", now);
    console.log("buy_time", buy_time);

    if (now >= buy_time) {
      // await setOffRobotStatus(robot_id, "finish");

      isMoreThanBuyTime.stop();
      await main(
        res,
        page,
        browser,
        user_id,
        settings,
        price_type,
        level_per_stock,
        stock_value_data,
        dana_per_stock,
        robot_id,
        URL_protofolio,
        thisUser,
        URL_accountinfo,
        spreadPerLevel,
        clValue,
        profitPerLevel
      );
    }
  });

  isMoreThanBuyTime.start();

  /** END */

  // await setOffRobotStatus(robot_id, "finish");
  // await browser.close();

  return res.json({
    success: 1,
    message: "Robot already run."
  });
};

// main automation
async function main(
  res,
  page,
  browser,
  user_id,
  settings,
  price_type,
  level_per_stock,
  stock_value_data,
  dana_per_stock,
  robot_id,
  URL_protofolio,
  thisUser,
  URL_accountinfo,
  spreadPerLevel,
  clValue,
  profitPerLevel
) {
  let mainExec = [];

  // if (settings.is_sell_by_time == "true") {
  //   // AUTOMATION INITIATION BUY (is_sell_by_time == true)
  //   mainExec[0] = await automationInitBuys(
  //     page,
  //     price_type,
  //     level_per_stock,
  //     stock_value_data,
  //     dana_per_stock,
  //     spreadPerLevel
  //   );
  // } else {
  //   // AUTOMATION INITIATION BUY (is_sell_by_time == false)
  //   mainExec[0] = await automationInitBuysSellTimeFalse(
  //     page,
  //     price_type,
  //     level_per_stock,
  //     stock_value_data,
  //     dana_per_stock,
  //     spreadPerLevel,
  //     user_id
  //   );
  // }

  mainExec[1] = await page.waitFor(5000);
  // // AUTOMATION
  mainExec[2] = await automation(
    res,
    page,
    browser,
    user_id,
    settings,
    robot_id,
    URL_protofolio,
    thisUser,
    URL_accountinfo,
    clValue,
    profitPerLevel,
    spreadPerLevel
  );

  Promise.all(mainExec).then(() => {
    console.log("automationInitBuys automation finish!!!");
  });

  console.log("main automation");
}

// automation
async function automation(
  res,
  page,
  browser,
  user_id,
  settings,
  robot_id,
  URL_protofolio,
  thisUser,
  URL_accountinfo,
  clValue,
  profitPerLevel,
  spreadPerLevel
) {
  const job = new CronJob("*/60 * * * * *", async function() {
    // INNITIATION
    settings = await getSettingData(user_id);
    let now = moment().format("HH:mm:ss");
    let is_sell_by_time = settings.is_sell_by_time;
    let getSellTime = moment(settings.cl_time, "HH:mm:ss");
    let sell_time = moment(getSellTime).format("HH:mm:ss");
    let getCloseTime = moment("14:50:00", "HH:mm:ss");
    let closeTime = moment(getCloseTime).format("HH:mm:ss");

    // SET / UPDATE DATA TO TUMI DATABASE
    let transaction = await setTransactionData(page, user_id, spreadPerLevel);
    await page.waitFor(5000);
    await automationPortofolio(page, URL_protofolio, user_id);
    await page.waitFor(5000);

    let matchStockBuy = transaction.matchStockBuy;
    let matchStockSell = transaction.matchStockSell;
    let openStockBuy = transaction.openStockBuy;
    let openStockSell = transaction.openStockSell;

    let openStock = transaction.openStock;

    // AUTOMATION SELL
    if (matchStockSell.length > 0) {
      await automationSells(page, matchStockSell);
    }

    // AUTOMATION BUY
    if (matchStockBuy.length > 0) {
      await automationBuys(page, matchStockBuy);
    }

    await withdraws(page, URL_accountinfo, robot_id, user_id);
    await page.waitFor(5000);
    await inputStockRangking(page);
    await page.waitFor(5000);

    // SELL BY TIME (ON)
    if (is_sell_by_time == "true") {
      if (now > sell_time) {
        let nowSellTime = await getSellTimeData(user_id);

        if (nowSellTime.length < 1) {
          let exec = [];
          exec[0] = await sellByTimeOnTrigger(
            page,
            user_id,
            openStockSell,
            openStock
          );
          exec[1] = await page.waitFor(5000);
          exec[0] = await setHasSellByTimeTrigger(user_id);

          Promise.all(exec).then(() => {
            console.log("sellByTimeTrigger finish!!!");
          });
        }
      }

      if (now > closeTime) {
        job.stop();

        let message = "Robot has done.";
        let exec = [];

        // exec[2] = await getUpdateSettingData(page, URL_protofolio, thisUser);
        // exec[3] = await page.waitFor(5000);
        exec[4] = await setTransactionData(page, user_id, spreadPerLevel);
        exec[5] = await page.waitFor(5000);
        exec[6] = await setOffRobotStatus(robot_id, message);
        exec[7] = await page.waitFor(5000);
        exec[8] = await browser.close();

        Promise.all(exec).then(() => {
          console.log(
            "getUpdateSettingData setTransactionData setOffRobotStatus finish!!!"
          );
        });
      }
    } else {
      // SELL BY TIME (OFF)
      await sellByTimeOffTrigger(
        page,
        URL_protofolio,
        user_id,
        clValue,
        profitPerLevel,
        openStock
      );

      // TURN OFF ROBOT
      if (now > closeTime) {
        job.stop();

        let message = "Robot has done.";
        let exec = [];

        exec[0] = await setInitBuySell(page, user_id);
        exec[1] = await page.waitFor(5000);
        exec[2] = await setTransactionData(page, user_id, spreadPerLevel);
        exec[3] = await page.waitFor(5000);
        exec[4] = await setOffRobotStatus(robot_id, message);
        exec[5] = await page.waitFor(5000);
        exec[6] = await browser.close();

        Promise.all(exec).then(() => {
          console.log(
            "setInitBuySell setTransactionData setOffRobotStatus finish!!!"
          );
        });
      }
    }

    console.log("globalIndex = ", globalIndex);
    globalIndex++;
  });

  job.start();
}

// automation initiation buys (is_sell_by_time == true)
async function automationInitBuys(
  page,
  price_type,
  level_per_stock,
  stock_value_data,
  dana_per_stock,
  spreadPerLevel
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
          dana_per_stock,
          idx,
          spreadPerLevel
        )
      );
    }
  }

  // run initiation buy stock
  Promise.all(stocksInitBuy).then(() => {
    console.log("finish initiation buy!!!");
  });
}

// automation initiation buys  (is_sell_by_time == false)
async function automationInitBuysSellTimeFalse(
  page,
  price_type,
  level_per_stock,
  stock_value_data,
  dana_per_stock,
  spreadPerLevel,
  user_id
) {
  let lastInit = await getLastInitBuysSells(user_id);
  let stocksInitSell = [];
  let stocksInitBuy = [];

  // init stock
  if (lastInit.length > 0) {
    for (let i = 0; i < lastInit.length; i++) {
      if (lastInit[i].mode == "Buy") {
        stocksInitBuy.push(await stockInitBuySellTimeOff(page, lastInit[i]));
      } else {
        stocksInitSell.push(await stockInitSellSellTimeOff(page, lastInit[i]));
      }
    }
  } else {
    for (let i = 0; i < stock_value_data.length; i++) {
      for (let idx = 0; idx < level_per_stock; idx++) {
        stocksInitBuy.push(
          await stockInitBuy(
            page,
            price_type,
            level_per_stock,
            stock_value_data[i],
            dana_per_stock,
            idx,
            spreadPerLevel
          )
        );
      }
    }
  }

  // run initiation buy stock
  Promise.all(stocksInitSell).then(() => {
    console.log("finish initiation sell (sell by time off) !!!");
  });

  // run initiation buy stock
  Promise.all(stocksInitBuy).then(() => {
    console.log("finish initiation buy (sell by time off) !!!");
  });
}

// automation sells
async function automationSells(page, matchStockBuys) {
  let dataStockSell = matchStockBuys;

  console.log("dataStockSell", dataStockSell);

  // set data stock sell
  let dataDB = [];

  dataDB[0] = setStockSell(dataStockSell);
  dataDB[1] = await page.waitFor(2000);
  dataDB[2] = getStockSell();
  dataDB[3] = console.log("dataDB", await dataDB[2]);
  dataDB[4] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log("setStockSell getStockSell finish!!!", dataDB[2]);
  });

  let getDataStockSell = await dataDB[2];
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

// automation buys
async function automationBuys(page, matchStockSells) {
  let dataStockBuy = matchStockSells;

  console.log("dataStockBuy", dataStockBuy);

  // set data stock buy
  let dataDB = [];

  dataDB[0] = setStockBuy(dataStockBuy);
  dataDB[1] = await page.waitFor(2000);
  dataDB[2] = getStockBuy();
  dataDB[3] = console.log("dataDB", await dataDB[2]);
  dataDB[4] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log("setStockBuy getStockBuy finish!!!");
  });

  let getDataStockBuy = await dataDB[2];
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

// automation sells by time on
async function automationSellByTimes(page, openStockSells, user_id) {
  let dataStockSellByTime = openStockSells;

  let dataDB = [];

  dataDB[0] = setStockSell(dataStockSellByTime);
  dataDB[1] = await page.waitFor(2000);
  dataDB[2] = getStockSellByTime();
  dataDB[3] = console.log("dataDB", await dataDB[2]);
  dataDB[4] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log("setStockSell getStockSellByTime finish!!!");
  });

  let dataSellStock = await dataDB[2];
  let stocksSellByTime = [];
  for (let i = 0; i < (await dataSellStock.length); i++) {
    stocksSellByTime.push(await stockSellByTime(page, await dataSellStock[i]));
    await updateStockTransaction(await dataSellStock[i]);
  }

  // run sell stock
  Promise.all(stocksSellByTime).then(() => {
    console.log("stocksSellByTime finish!!!");
  });
}

// automation sells by time off
async function automationSellByTimesOff(page, openStockSells, user_id) {
  let dataStockSellByTime = openStockSells;

  let dataDB = [];

  dataDB[0] = setStockSell(dataStockSellByTime);
  dataDB[1] = await page.waitFor(2000);
  dataDB[2] = getStockSellByTime();
  dataDB[3] = console.log("dataDB", await dataDB[2]);
  dataDB[4] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log("setStockSell getStockSellByTime finish!!!");
  });

  let dataSellStock = await dataDB[2];
  let stocksSellByTime = [];
  for (let i = 0; i < (await dataSellStock.length); i++) {
    stocksSellByTime.push(
      await stockSellByTimeOff(page, await dataSellStock[i])
    );
    await updateStockTransaction(await dataSellStock[i]);
  }

  // run sell stock
  Promise.all(stocksSellByTime).then(() => {
    console.log("stocksSellByTime finish!!!");
  });
}

// automation withdraw stock sell (sell by time on)
async function automationWithdrawStockSell(page, withdrawData) {
  let data = await withdrawData;
  let withdrawStockSell = [];

  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].mode == "Sell") {
      withdrawStockSell.push(
        await setWithdrawStockSell(page, await data[i], i)
      );
    }
  }

  // run withdraw stock
  Promise.all(withdrawStockSell).then(() => {
    console.log("withdrawStockSell finish!!!");
  });
}

// automation withdraw stock sell (sell by time off)
async function automationWithdrawStockSellOff(page, withdrawData) {
  let data = await withdrawData;
  let withdrawStockSell = [];

  for (let i = data.length - 1; i >= 0; i--) {
    withdrawStockSell.push(
      await setWithdrawStockSell(page, await data[i], data[i].index)
    );
  }

  // run withdraw stock
  Promise.all(withdrawStockSell).then(() => {
    console.log("withdrawStockSell finish!!!");
  });
}

// set automation withdraw rhb
async function automationSetWithdrawRhb(
  page,
  URL_accountinfo,
  robot_id,
  user_id
) {
  let dataDB = [];

  dataDB[0] = getWithdrawData(user_id);
  dataDB[1] = console.log("dataDB", await dataDB[0]);
  dataDB[2] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log("getWithdrawData finish!!!");
  });

  let requrstWithdraw = await dataDB[0];

  console.log("requrstWithdraw", await requrstWithdraw.length);

  let execWithdraw = [];
  for (let i = 0; i < (await requrstWithdraw.length); i++) {
    execWithdraw.push(
      await setWithdrawRhb(page, URL_accountinfo, await requrstWithdraw[i])
    );
    await updateWithdrawData(await requrstWithdraw[i]);
  }

  // run sell stock
  Promise.all(execWithdraw).then(() => {
    console.log("execWithdraw finish!!!");
  });
}

// sell by time on trigger
async function sellByTimeOnTrigger(page, user_id, openStockSell, openStock) {
  let openStockSells = await openStockSell;
  let stockOpen = await openStock;

  if (stockOpen.length > 0) {
    // set index into every element
    let mapWithdrawStockSell = stockOpen.map((el, i) => {
      return {
        ...el,
        index: i
      };
    });

    if (mapWithdrawStockSell.length > 0) {
      await automationWithdrawStockSell(page, mapWithdrawStockSell);
    }

    if (openStockSells.length > 0) {
      await automationSellByTimes(page, openStockSells, user_id);
    }
  }
}

// sell by time off trigger
async function sellByTimeOffTrigger(
  page,
  URL_protofolio,
  user_id,
  clValue,
  profitPerLevel,
  openStock
) {
  let data = await automationPortofolio(page, URL_protofolio, user_id);
  await page.waitFor(1000);

  let filterStockProtofolio = await data.table.map(el => ({
    stock: el.stock,
    last: el.last
  }));

  // get open stock
  let stockOpen = await openStock;

  if (stockOpen.length > 0) {
    let mapStockOpen = stockOpen.map((el, i) => ({
      ...el,
      index: i
    }));

    mapStockOpen.forEach((el, i) => {
      let dataLast = filterStockProtofolio.filter(fsp => fsp.stock == el.stock);
      let price = parseInt(el.price);

      el.last = parseInt(dataLast[0].last);
      el.cl = Math.round(price - (price * clValue) / 100);
      el.tp = Math.round(price + (price * profitPerLevel) / 100);
    });

    // get tp or cl
    let tpclStock = await getTpClStock(mapStockOpen, user_id);

    if (tpclStock.length > 0) {
      let tpclStockSell = tpclStock.filter(el => {
        return el.mode == "Sell";
      });

      if (tpclStockSell.length > 0) {
        await automationWithdrawStockSellOff(page, tpclStockSell);

        await page.waitFor(2000);

        await automationSellByTimesOff(page, tpclStockSell, user_id);
      }
    }
  }
}

// set init buy stocks (sell by time == true)
async function stockInitBuy(
  page,
  price_type,
  level,
  stock,
  dana_per_stock,
  i,
  spreadPerLevel
) {
  const URL_orderpad_buy =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?buy";

  console.log("stock ", stock);
  await page.goto(URL_orderpad_buy);
  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(4000);

  let stockBudget = dana_per_stock;
  let price = await getBuyPrice(page, price_type, level, spreadPerLevel);
  let lot = await getLot(stockBudget, level, price[i]);

  if (price[i] != "NaN") {
    if (parseInt(price[i]) >= 50) {
      await page.type("input[id='_price']", price[i]);
      await page.type("input[id='_volume']", lot);
      await page.click("button[id='_enter']");
      await page.waitFor(1000);
      await page.click("button[id='_confirm']");
      await page.waitFor(1000);
      console.log("=-=-=-=-=BUY=-=-=-=-=", parseInt(price[i]));
    }
  }

  console.log("price ", await price);
  console.log("lot ", lot);
  console.log("price[] ", await price[i]);
  console.log("finish");
  console.log("##############################################");

  return await page.waitFor(1000);
}

// set init buy stocks (sell by time == false)
async function stockInitBuySellTimeOff(page, lastInit) {
  const URL_orderpad_buy =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?buy";

  let stock = lastInit.stock;
  let price = lastInit.price.toString();
  let lots = lastInit.lots.toString();

  await page.goto(URL_orderpad_buy);
  await page.type("input[id='_stockCode']", stock);

  if (parseInt(price) >= 50) {
    await page.type("input[id='_price']", price);
    await page.type("input[id='_volume']", lots);
    await page.click("button[id='_enter']");
    await page.waitFor(1000);
    await page.click("button[id='_confirm']");
    await page.waitFor(1000);
    console.log("=-=-=-=-=BUY INIT=-=-=-=-=", parseInt(price));
  }

  console.log("price ", price);
  console.log("lot ", lots);
  console.log("finish");
  console.log("##############################################");

  return await page.waitFor(1000);
}

// set init sell stocks (sell by time == false)
async function stockInitSellSellTimeOff(page, lastInit) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";

  let stock = lastInit.stock;
  let price = lastInit.price.toString();
  let lots = lastInit.lots.toString();

  await page.goto(URL_orderpad_sell);
  await page.type("input[id='_stockCode']", stock);

  if (parseInt(price) >= 50) {
    await page.type("input[id='_price']", price);
    await page.type("input[id='_volume']", lots);
    await page.click("button[id='_enter']");
    await page.waitFor(1000);
    await page.click("button[id='_confirm']");
    await page.waitFor(1000);
    console.log("=-=-=-=-=SELL INIT=-=-=-=-=", parseInt(price));
  }

  console.log("price ", price);
  console.log("lot ", lots);
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

  await page.type("input[id='_volume']", lots);
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

// set sell stocks by time on
async function stockSellByTime(page, dataStockSell) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";
  let stock = dataStockSell.stock;
  let lots = dataStockSell.lots;

  console.log("stock ", stock);

  await page.goto(URL_orderpad_sell);

  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(3000);

  let bidPrice = await getBidPrice(page);

  console.log("type ", bidPrice);

  if (bidPrice != "&nbsp;") {
    await page.type("input[id='_volume']", lots);
    await page.type("input[id='_price']", bidPrice);
    await page.click("button[id='_enter']");
    await page.waitFor(1000);
    await page.click("button[id='_confirm']");
    await page.waitFor(1000);
    console.log("=-=-=-=-=SELL BY TIME=-=-=-=-=", bidPrice);
  }

  console.log("finish");
  console.log("##############################################");

  return await page.waitFor(1000);
}

// set sell stocks by time off
async function stockSellByTimeOff(page, dataStockSell) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";
  let stock = dataStockSell.stock;
  let lots = dataStockSell.lots;

  let priceSell = dataStockSell.priceSell;

  console.log("stock ", stock);

  await page.goto(URL_orderpad_sell);

  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(3000);

  await page.type("input[id='_volume']", lots);
  await page.type("input[id='_price']", priceSell);
  await page.click("button[id='_enter']");
  await page.waitFor(1000);
  await page.click("button[id='_confirm']");
  await page.waitFor(1000);
  console.log("=-=-=-=-=SELL BY TIME=-=-=-=-=", priceSell);

  console.log("finish");
  console.log("##############################################");

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

  await page.type("input[id='_volume']", lots);
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
          }

          items.push(result);
        }

        resolve(items);
      });
    });
    return data;
  } catch (err) {
    return err;
  }
}

// get stock rangking
async function stockRanking(page) {
  await page.goto(
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/stock_ranking.jsp"
  );

  await page.click("button[onclick='loadData();']");

  await page.waitFor(3000);

  await page.click("th[aria-label='Chg%: activate to sort column ascending']");
  await page.click("th[class='title-content sorting_asc']");

  await page.waitFor(1000);

  const first_data = await page.evaluate(() => {
    let table = document.querySelector("#_tsorter");
    let row = table.children;
    let page1 = [];
    for (let i = 0; i < row.length; i++) {
      const el = row[i];
      let item = el.children;

      let result = {};

      result["stock"] = item[0].textContent;
      result["prev"] = item[1].textContent;
      result["open"] = item[2].textContent;
      result["high"] = item[3].textContent;
      result["low"] = item[4].textContent;
      result["last"] = item[5].textContent;
      result["chg"] = item[6].textContent;
      result["chg_percent"] = item[7].textContent;
      result["freq"] = item[8].textContent;
      result["vol"] = item[9].textContent;
      result["val"] = item[10].textContent;

      page1.push(result);
    }
    return page1;
  });

  await page.click("a[data-dt-idx='2']");

  const second_data = await page.evaluate(() => {
    let table = document.querySelector("#_tsorter");
    let row = table.children;
    let page2 = [];
    for (let i = 0; i < row.length; i++) {
      const el = row[i];
      let item = el.children;

      let result = {};

      result["stock"] = item[0].textContent;
      result["prev"] = item[1].textContent;
      result["open"] = item[2].textContent;
      result["high"] = item[3].textContent;
      result["low"] = item[4].textContent;
      result["last"] = item[5].textContent;
      result["chg"] = item[6].textContent;
      result["chg_percent"] = item[7].textContent;
      result["freq"] = item[8].textContent;
      result["vol"] = item[9].textContent;
      result["val"] = item[10].textContent;

      page2.push(result);
    }
    return page2;
  });
  let fulldata = first_data.concat(second_data);
  // console.log(fulldata)
  return fulldata;
}

// input stock rangking
async function inputStockRangking(page) {
  let stock_rangking, getStockrangking, stock, stock_rangkings, err;

  getStockrangking = await stockRanking(page);

  // const browser = await puppeteer.launch({
  //     headless: true,
  //     defaultViewport: null
  //   });

  //   const page = await browser.newPage();
  await page.waitFor(1000);

  // console.log(stock)
  // stock_rangkings.set(element)
  Promise.all([
    ([err, stock_rangkings] = await to(Stock_rangking.findAll({ raw: true }))),
    stock_rangkings.forEach(async element => {
      ([err, stock_rangkings] = await to(
        Stock_rangking.findOne({ where: { id: element.id } })
      )),
        // console.log(stock_rangkings)
        ([err, stock_rangkings] = await to(stock_rangkings.destroy()));
    }),

    getStockrangking.forEach(async el => {
      [err, stock_rangking] = await to(Stock_rangking.create(el));
    })
  ]);
}

// get Users
async function getUsers(robot_id) {
  let userData, securityData, robotData;
  [err, userData] = await to(User.findAll({ raw: true }));
  [err, securityData] = await to(Security.findAll({ raw: true }));
  [err, robotData] = await to(Robot.findOne({ where: { id: robot_id } }));
  [err, m_setting_data] = await to(Master_Setting.findAll({ raw: true }));
  [err, u_setting_data] = await to(User_Setting.findAll({ raw: true }));

  let data = {};
  let config_name = "";

  // get user
  let filter_user = userData.filter(ud => {
    return ud.id == robotData.user_id && ud.status == "active";
  });
  // get security
  let filter_security = securityData.filter(sd => {
    return sd.id == robotData.security_id;
  });
  // get setting
  let filter_setting = u_setting_data.filter(usd => {
    return usd.user_id == robotData.user_id;
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

  data = {
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
    robot_status: robotData.status,
    setting: dataSetting
  };

  return Promise.resolve(data);
}

// set stock sell
async function setStockSell(stockData) {
  let err, stockSell;

  console.log("stockData", stockData);

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

  return true;
}

// get stock buy
async function getStockSell() {
  let err, stockSell;

  let trxNow = moment().format("YYYY-MM-DD");

  [err, stockSell] = await to(
    Stock_Sell.findAll({
      where: {
        mode: "Buy",
        status: "Matched",
        on_sale: "no"
      }
    })
  );

  let data = [];

  data = stockSell.filter(el => {
    let stockDate = moment(el.createdAt).format("YYYY-MM-DD");
    return stockDate == trxNow;
  });

  return data;
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

  let trxNow = moment().format("YYYY-MM-DD");

  [err, stockBuy] = await to(
    Stock_Sell.findAll({
      where: {
        mode: "Sell",
        status: "Matched",
        on_sale: "no"
      }
    })
  );

  let data = [];

  data = stockBuy.filter(el => {
    let stockDate = moment(el.createdAt).format("YYYY-MM-DD");
    return stockDate == trxNow;
  });

  return data;
}

// set withdraw stock sell
async function setWithdrawStockSell(page, withdrawData, i) {
  const URL_orderstatus =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp";

  await page.goto(URL_orderstatus);
  await page.waitFor(2000);

  let steps = [];

  steps[0] = await page.click(
    "img[onclick='objPopup.showPopupWithdraw(" + i + ");']"
  );
  steps[1] = await page.waitFor(500);
  steps[2] = await page.click("input[onclick='objPopup.doPopupWithdraw();']");

  // run withdraw stock
  Promise.all(steps).then(() => {
    console.log("withdrawStockSell");
  });

  await page.waitFor(2000);
}

// update on sale stock
async function updateStockTransaction(stockData) {
  let err, stockSell;

  let updateData = {
    on_sale: "yes",
    updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
  };

  [err, stockSell] = await to(
    Stock_Sell.findOne({ where: { order_id: stockData.order_id } })
  );

  stockSell.set(updateData);
  [err, stockSell] = await to(stockSell.save());
}

// get spesify bid price
async function getBidPrice(page) {
  return await page.evaluate(
    () => document.querySelector("td[id='_bidVal0']").innerHTML
  );
}

// get spesify buy price (sell by time == true)
async function getBuyPrice(page, price_type, level, spreadPerLevel) {
  let price;
  let dataPrice = [];
  let spread = 0;
  if (price_type == "open") {
    price = await getOpenPrice(page);
  } else if (price_type == "prev") {
    price = await getPrevClosePrice(page);
  } else {
    price = await getClosePrice(page);
  }

  dataPrice[0] = parseInt(await price);
  // spread price by level per stock

  spread = await getSpread(await dataPrice[0], spreadPerLevel);

  for (let i = 1; i < level; i++) {
    dataPrice[i] = dataPrice[i - 1] - (await spread);
  }

  for (let i = 0; i < level; i++) {
    dataPrice[i] = dataPrice[i].toString();
  }

  return dataPrice;
}

// get spread price
async function getSpread(dataPrice, spreadPerLevel) {
  // spread per level
  let spl = parseInt(await spreadPerLevel);
  let spread = 0;

  spread = Math.round(dataPrice * (spl / 100));

  return spread;
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

// get lot
async function getLot(stockBudget, level, price) {
  console.log("stockBudget, level, price", {
    stockBudget: parseInt(stockBudget),
    level: level,
    price: parseInt(price)
  });

  return Math.round(
    parseInt(stockBudget) / level / parseInt(price) / 100
  ).toString();
}

// login
async function login(page, username, password, robot_id) {
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
    path: "./public/images/captcha/captcha" + robot_id + ".png",
    omitBackground: true
  });

  let tokenCaptcha = await Tesseract.recognize(
    "./public/images/captcha/captcha" + robot_id + ".png",
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

// get update setting data
async function getUpdateSettingData(page, URL_protofolio, thisUser) {
  await page.goto(URL_protofolio);
  await page.waitFor(1000);

  let user_id = thisUser.user_id;
  let setting = thisUser.setting;

  let cost_total = await page.evaluate(
    () => document.querySelector("div[id='_newOutstandingBalance']").innerHTML
  );

  thisUser.setting.cost_total = cost_total;

  let settings = await setSettings(user_id, setting);

  return await settings;
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
      updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
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

// get setting data
async function getSettingData(user_id) {
  let u_setting, m_setting;

  [err, u_setting] = await to(
    User_Setting.findAll({ where: { user_id: user_id } })
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

// set on robot status
async function setOnRobotStatus(robot_id) {
  let robot, data;

  data = {
    status: "on",
    off_message: null
  };

  [err, robot] = await to(Robot.findOne({ where: { id: robot_id } }));
  robot.set(data);
  [err, robot] = await to(robot.save());
}

// set off robot status
async function setOffRobotStatus(robot_id, message) {
  let robot, data;

  data = {
    status: "off",
    off_message: message
  };

  [err, robot] = await to(Robot.findOne({ where: { id: robot_id } }));
  robot.set(data);
  [err, robot] = await to(robot.save());
}

// set data sell time
async function setSellTimeData(user_id) {
  let err, sellTime;
  let trxNow = moment().format("YYYY-MM-DD");

  let data = {
    user_id: user_id,
    on_sell_by_time: "yes"
  };

  [err, sellTime] = await to(Sell_Times.create(data));
}

// get data sell time transaction now
async function getSellTimeData(user_id) {
  let err, sellTime;
  let trxNow = moment().format("YYYY-MM-DD");

  [err, sellTime] = await to(
    Sell_Times.findAll({ where: { user_id: user_id } })
  );

  let nowSellTime = sellTime.filter(el => {
    let createdAt = moment(el.createdAt).format("YYYY-MM-DD");

    return trxNow == createdAt;
  });

  if (nowSellTime.length == 0) {
    await setSellTimeData(user_id);
  }

  return nowSellTime;
}

// exec withdraw
async function withdraws(page, URL_accountinfo, robot_id, user_id) {
  let exec = [];

  exec[0] = await setWithdrawData(page, URL_accountinfo, robot_id, user_id);
  exec[1] = await page.waitFor(3000);
  exec[2] = await automationSetWithdrawRhb(
    page,
    URL_accountinfo,
    robot_id,
    user_id
  );
  exec[3] = await page.waitFor(3000);
  exec[4] = await setWithdrawData(page, URL_accountinfo, robot_id, user_id);

  // run withdraw stock
  Promise.all(exec).then(() => {
    console.log("withdraw Execute");
  });
}

// get withdraw data
async function getWithdrawRhb(page, URL_accountinfo, robot_id) {
  let now = moment()
    .subtract(1, "months")
    .format("MM/01/YYYY");
  await page.goto(URL_accountinfo);
  await page.waitFor(1000);

  await page.type("input[id='date-from']", now);
  await page.waitFor(1000);
  await page.click("button[onclick='loadWithdrawList();']");
  await page.waitFor(1000);

  try {
    await page.waitFor(1000);
    const data = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        let table = document.querySelector("#_requestTable");
        let row = table.children;
        let items = [];

        for (let index = 0; index < row.length; index++) {
          let result = {};

          for (let i = 0; i < row[index].cells.length; i++) {
            result["request_time"] = row[index].cells[0].textContent;
            result["reference_no"] = row[index].cells[1].textContent;
            result["amount"] = row[index].cells[2].textContent;
            result["processed_at"] = row[index].cells[3].textContent;
            result["status"] = row[index].cells[4].textContent;
            result["reason"] = row[index].cells[5].textContent;
          }

          items.push(result);
        }

        resolve(items);
      });
    });
    return data;
  } catch (err) {
    await setOffRobotStatus(robot_id, "fail get withdraw data");
    return err;
  }
}

// set withdraw
async function setWithdrawRhb(page, URL_accountinfo, requrstWithdraw) {
  let wAmount = requrstWithdraw.amount;
  await page.goto(URL_accountinfo);
  await page.waitFor(1000);

  await page.type("input[id='_amount']", wAmount);
  await page.waitFor(1000);
  await page.click("button[onclick='saveWithdrawCommand();']");
  await page.waitFor(1000);
}

// set object data withdraw
async function setObjectDataWithdraw(dataGetWistdraw, user_id) {
  let dataWithdraw = [];

  dataGetWistdraw.forEach((el, i) => {
    let formatProcessedAt = null;
    let getRequestTime = moment(el.request_time, "DD MMM YYYY");
    let formatRequestTime = moment(getRequestTime).format(
      "YYYY-MM-DD HH:mm:ss"
    );

    if (el.processed_at != "") {
      let getProcessedAt = moment(el.processed_at, "DD MMM YYYY HH:mm");
      formatProcessedAt = moment(getProcessedAt).format("YYYY-MM-DD HH:mm:ss");
    }

    let amount = el.amount.replace(/,\s*/g, "");

    dataWithdraw[i] = {
      request_time: formatRequestTime,
      reference_no: el.reference_no,
      amount: amount,
      processed_at: formatProcessedAt,
      status: el.status,
      reason: el.reason,
      user_id: user_id,
      updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
    };
  });

  return dataWithdraw;
}

// set withdraw data
async function setWithdrawData(page, URL_accountinfo, robot_id, user_id) {
  let dataGetWistdraw = await getWithdrawRhb(page, URL_accountinfo, robot_id);

  await page.waitFor(3000);

  let dataWithdraw = await setObjectDataWithdraw(dataGetWistdraw, user_id);

  await page.waitFor(3000);
  let uWithdraw, err;

  dataWithdraw.forEach(async el => {
    [err, uWithdraw] = await to(
      User_Withdraw.findOne({
        where: { reference_no: el.reference_no }
      })
    );
    if (!uWithdraw) {
      [err, uWithdraw] = await to(User_Withdraw.create(el));
    } else {
      uWithdraw.set(el);
      [err, uWithdraw] = await to(uWithdraw.save());
    }
  });
}

// get withdraw data
async function getWithdrawData(user_id) {
  let err, requrstWithdraw;

  [err, requrstWithdraw] = await to(
    Withdraw.findAll({ where: { user_id: user_id, on_submit: "no" } })
  );

  return requrstWithdraw;
}

// update withdraw data
async function updateWithdrawData(requrstWithdraw) {
  let err, withdraw;
  let w_id = requrstWithdraw.id;

  let updateData = {
    on_submit: "yes",
    updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
  };

  [err, withdraw] = await to(Withdraw.findOne({ where: { id: w_id } }));

  withdraw.set(updateData);
  [err, withdraw] = await to(withdraw.save());
}

// get portofolio rhb
async function getPortofolioRhb(page, URL_protofolio) {
  await page.goto(URL_protofolio);
  await page.waitFor(2000);

  const headData = {};

  let startingBalance = await page.evaluate(
    () => document.querySelector("div[id='_startingBalance']").innerHTML
  );
  await page.waitFor(1000);

  let availableLimit = await page.evaluate(
    () => document.querySelector("div[id='_availableLimit']").innerHTML
  );
  await page.waitFor(1000);

  let fundingAvailable = await page.evaluate(
    () => document.querySelector("div[id='_fundingAvailable']").innerHTML
  );
  await page.waitFor(1000);

  let totalAsset = await page.evaluate(
    () => document.querySelector("div[id='_totalAsset']").innerHTML
  );
  await page.waitFor(1000);

  let cashRdn = await page.evaluate(
    () => document.querySelector("div[id='_cashRdn']").innerHTML
  );
  await page.waitFor(1000);
  const item = [];

  (headData["starting_balance"] = await startingBalance.replace(/,\s*/g, "")),
    (headData["available_limit"] = await availableLimit.replace(/,\s*/g, "")),
    (headData["funding_available"] = await fundingAvailable.replace(
      /,\s*/g,
      ""
    )),
    (headData["total_asset"] = await totalAsset.replace(/,\s*/g, "")),
    (headData["cash_in_rdn"] = await cashRdn.replace(/,\s*/g, "")),
    item.push(headData);

  await page.waitFor(1000);
  const table = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      let table = document.querySelector("#_portfolio");
      let row = table.children;
      let items = [];
      let length = [];
      length = row.length - 1;

      for (let i = 0; i < length; i++) {
        let result = {};
        const tr = row[i];
        const text = tr.children;
        if (!text[i].textContent) {
        } else {
          result["stock"] = text[0].textContent;
          (result["avg_buy"] = text[1].textContent.replace(/,\s*/g, "")),
            (result["last"] = text[2].textContent);
          (result["gross_value"] = text[6].textContent.replace(/,\s*/g, "")),
            (result["market_value"] = text[7].textContent.replace(/,\s*/g, "")),
            (result["pl_price"] = text[10].textContent.replace(/,\s*/g, "")),
            (result["pl_percent"] = text[11].textContent.replace(/,\s*/g, "")),
            items.push(result);
        }
      }
      resolve(items);
    });
  });

  return { item, table };
}

// set protofolio data
async function setProtofolioData(page, getPortofolio, user_id) {
  getPortofolio.item.forEach(async el => {
    [err, portofolios] = await to(Portofolios.findOne({ where: { user_id } }));

    el.user_id = user_id;
    console.log(portofolios);
    if (!portofolios) {
      [err, portofolios] = await to(Portofolios.create(el));
      lastinsertId = portofolios.dataValues.id;
      // if (err) return ReE(res, err, 422);
    } else {
      portofolios.set(el);
      [err, portofolios] = await to(portofolios.save());
      lastinsertId = portofolios.dataValues.id;
      // if (err) return ReE(res, err, 422);

      //   }
    }
  });

  await page.waitFor(2000);

  getPortofolio.table.forEach(async el => {
    [err, portofolio_stock] = await to(
      Portofolio_stocks.findOne({ where: { user_id: user_id } })
    );

    el.portofolio_id = lastinsertId;
    el.user_id = user_id;
    // console.log(portofolio_stock)
    if (!portofolio_stock) {
      [err, portofolio_stock] = await to(Portofolio_stocks.create(el));
    } else {
      Promise.all([
        ([err, portofolio_stock] = await to(
          Portofolio_stocks.findAll({ where: { user_id: user_id } })
        )),
        portofolio_stock.forEach(async element => {
          if (element) {
            ([err, portofolio_stock] = await to(
              Portofolio_stocks.findOne({ where: { id: element.id } })
            )),
              ([err, portofolio_stock] = await to(element.destroy()));
          }
        })
      ])[(err, portofolio_stock)] = await to(Portofolio_stocks.create(el));
    }
  });
}

// automation protofolio
async function automationPortofolio(page, URL_protofolio, user_id) {
  let exec = [];

  exec[0] = await getPortofolioRhb(page, URL_protofolio);
  exec[1] = await page.waitFor(1000);
  exec[2] = await console.log("portofolio", await exec[0]);
  exec[3] = await page.waitFor(1000);
  exec[4] = await setProtofolioData(page, exec[0], user_id);

  Promise.all(exec).then(() => {
    console.log("getPortofolioRhb setProtofolioData finish!!!");
  });

  return await exec[0];
}

// get data if last more than tp or last less than cl
async function getTpClStock(mapStockOpen, user_id) {
  let dataMapStockOpen = [];

  mapStockOpen.forEach((el, i) => {
    // target profit >= last
    if (el.tp >= el.last) {
      dataMapStockOpen.push({
        order_id: el.order_id,
        user_id: user_id,
        stock: el.stock,
        mode: el.mode,
        lots: el.lots,
        status: el.status,
        priceBuy: el.price,
        priceSell: el.tp.toString(),
        tp: el.tp,
        cl: el.cl,
        last: el.last,
        index: el.index,
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      });
    }

    // cut lost <= last
    if (el.cl <= el.last) {
      dataMapStockOpen.push({
        order_id: el.order_id,
        user_id: user_id,
        stock: el.stock,
        mode: el.mode,
        lots: el.lots,
        status: el.status,
        priceBuy: el.price,
        priceSell: el.cl.toString(),
        tp: el.tp,
        cl: el.cl,
        last: el.last,
        index: el.index,
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      });
    }
  });
  return dataMapStockOpen;
}

// get last init sell
async function getLastInitBuysSells(user_id) {
  let lastInitBuy = [];
  let lastOrder = moment()
    .subtract(1, "days")
    .format("YYYY-MM-DD");

  let err, initBuy;

  [err, initBuy] = await to(Init_Buy.findAll({ where: { user_id: user_id } }));

  if (initBuy.length > 0) {
    lastInitBuy = initBuy.filter(el => {
      let orderDate = moment(el.order_date).format("YYYY-MM-DD");

      return orderDate == lastOrder;
    });
  }

  return lastInitBuy;
}

// set transaction
async function setTransactionData(page, user_id, spreadPerLevel) {
  let getDataTransaction = await getTransaction(page);

  await page.waitFor(4000);

  let err, transaction;

  getDataTransaction.forEach(async el => {
    el.user_id = user_id;
    // set data
    [err, transaction] = await to(
      Transaction.findOne({ where: { order_id: el.order_id } })
    );
    if (!transaction) {
      console.log(el);
      [err, transaction] = await to(Transaction.create(el));
    } else {
      transaction.set(el);
      [err, transaction] = await to(transaction.save());
    }
  });

  let dataStock = {};
  let dataStockBuy = [];
  let dataStockSell = [];
  let openStockBuy = [];
  let openStockSell = [];
  let matchStockBuy = [];
  let matchStockSell = [];

  let openStock = [];

  getDataTransaction.forEach(async (el, i) => {
    let spl = parseInt(spreadPerLevel);
    let spread = 0;

    spread = Math.round(el.price * (spl / 100));

    if (el.status == "Open") {
      openStock.push(el);
    }

    if (el.mode == "Buy") {
      dataStockSell.push({
        order_id: el.order_id,
        user_id: user_id,
        stock: el.stock,
        mode: el.mode,
        lots: el.lots,
        status: el.status,
        priceBuy: el.price,
        priceSell: (parseInt(el.price) + spread).toString(),
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      });
    } else if (el.mode == "Sell") {
      dataStockBuy.push({
        order_id: el.order_id,
        user_id: user_id,
        stock: el.stock,
        mode: el.mode,
        lots: el.lots,
        status: el.status,
        priceBuy: (parseInt(el.price) - spread).toString(),
        priceSell: el.price,
        createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
      });
    }
  });

  matchStockSell = dataStockSell.filter(el => el.status == "Matched");
  openStockSell = dataStockSell.filter(el => el.status == "Open");
  matchStockBuy = dataStockBuy.filter(el => el.status == "Matched");
  openStockBuy = dataStockBuy.filter(el => el.status == "Open");

  dataStock = {
    dataStockSell,
    dataStockBuy,
    matchStockSell,
    matchStockBuy,
    openStockSell,
    openStockBuy,
    openStock
  };

  return dataStock;
}

// set last init sell by time off
async function setInitBuySell(page, user_id) {
  let now = moment().format("YYYY-MM-DD HH:mm:ss");
  let transaction = await getTransaction(page);

  let filterInit = await transaction.filter(el => {
    return el.status == "Open";
  });

  if (filterInit.length > 0) {
    filterInit.forEach(async el => {
      let orderDate = moment().format("YYYY-MM-DD");
      let orderDateTime = orderDate + " " + el.order_time;
      let data = {
        user_id: user_id,
        order_date: orderDateTime,
        stock: el.stock,
        price: el.price,
        mode: el.mode,
        updatedAt: now,
        lots: el.lots
      };
      [err, initBuy] = await to(Init_Buy.create(data));
    });
  }
}
