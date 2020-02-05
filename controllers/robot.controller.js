const axios = require("axios");
const { Check_Init_Buy } = require("../models");
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

const { Op } = (Sequelize = require("sequelize"));

const puppeteer = require("puppeteer");
const Tesseract = require("../node_modules/tesseract.js");
const fs = require("fs");
const moment = require("moment");
const CronJob = require("cron").CronJob;

require("dotenv").config();

let getCloseTime = moment("16:15:00", "HH:mm:ss");

/**
 *  gData is a global variable
 *  - runSecondaryJob
 *  - thisInitBuy
 *  - thisPortfolio
 *  - getSellTime
 *  - is_sell_by_time
 */
var gData = {};

module.exports.run = async function(req, res) {
  // initiation global variable
  let robot_id = req.params.robot_id;
  let secondaryP_GlobalIndex = 0;
  let secondarySR_GlobalIndex = 0;
  let secondaryW_GlobalIndex = 0;
  let secondaryT_GlobalIndex = 0;
  let secondaryS_GlobalIndex = 0;

  eval("gData.runSecondaryJob" + robot_id + "= true;");
  eval("gData.thisInitBuy" + robot_id + "= true;");
  eval("gData.thisPortfolio" + robot_id + "= [];");
  eval("gData.getSellTime" + robot_id + "= '';");
  eval("gData.is_sell_by_time" + robot_id + "= '';");
  eval("gData.index" + robot_id + "= 0;");
  eval("gData.errMsg" + robot_id + "= 'Gagal terhubung dengan RHB';");

  console.log("Global Data Robot " + robot_id + " = ", gData);

  const URL_login =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/login.jsp";
  const URL_protofolio =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/portfolio.jsp";
  const URL_runningTrade =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/runningTrade.jsp";
  const URL_accountinfo =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/accountinfo.jsp";

  let thisUser = await getUsers(robot_id);

  let username = thisUser.security_user_id;
  let password = thisUser.password;
  let pin = thisUser.pin;
  let user_id = thisUser.user_id;

  /** TEST */

  /** END TEST */

  console.log(moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id);

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

  try {
    /**
     * OPEN RHB PAGE
     */
    const page = await browser.newPage();
    // page trading exec
    const pageTrx = await browser.newPage();
    // page portfolio
    const pagePF = await browser.newPage();
    // page stock ranking
    const pageSR = await browser.newPage();
    // page withdraws
    const pageWd = await browser.newPage();
    // page transaction
    const pageT = await browser.newPage();

    page.on("dialog", async dialog => {
      await dialog.accept();
    });
    pageTrx.on("dialog", async dialog => {
      await dialog.accept();
    });
    pagePF.on("dialog", async dialog => {
      await dialog.accept();
    });
    pageSR.on("dialog", async dialog => {
      await dialog.accept();
    });
    pageWd.on("dialog", async dialog => {
      await dialog.accept();
    });
    pageT.on("dialog", async dialog => {
      await dialog.accept();
    });

    await page.goto(URL_login);
    await page.waitFor(2000);

    // LOGIN RHB
    await login(res, browser, page, username, password, robot_id);
    await setOnRobotStatus(robot_id);

    // LOGIN TRADING
    await loginTrading(res, browser, page, URL_runningTrade, pin);

    // GET SETTING DATA
    let settings = await getSettingData(user_id);

    // GET SETTING DATA IF SELL BY TIME IS TRUE
    let lastInit = await getLastInitBuysSells(user_id);
    if (settings.is_sell_by_time == "true" || lastInit.length == 0) {
      settings = await getUpdateSettingData(pagePF, URL_protofolio, thisUser);
    }

    let level_per_stock = parseInt(await settings.level_per_stock);
    let dana_per_stock = await settings.dana_per_stock;
    let spreadPerLevel = await settings.spread_per_level;
    let profitPerLevel = await settings.profit_per_level;
    let clValue = await settings.cl_value;

    let price_type = await settings.price_type;
    let stock_value_string = await settings.stock_value;
    let stock_value_data = await stock_value_string.split(",", 4);
    let stock_mode_id = await settings.stock_mode;

    if (stock_mode_id == "custom") {
      stock_mode_id = "okjz6if";
    }

    eval("gData.is_sell_by_time" + robot_id + "= settings.is_sell_by_time;");

    eval(
      "gData.getSellTime" + robot_id + "= moment(settings.cl_time, 'HH:mm:ss');"
    );

    /** TEST */

    /** END TEST */

    /** START */

    /**
     *  SECONDARY JOB
     *  Settings
     */
    const jobSecondaryS = new CronJob("*/120 * * * * *", async function() {
      let time = moment().format("HH:mm:ss");
      let rest = await getRestTime(time);

      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Time = " +
          time +
          " Setting"
      );
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Rest = " +
          rest +
          " Setting"
      );

      if (!rest) {
        if (eval("gData.runSecondaryJob" + robot_id)) {
          // INNITIATION
          settings = await getSettingData(user_id);
          eval(
            "gData.is_sell_by_time" + robot_id + "= settings.is_sell_by_time;"
          );

          eval(
            "gData.getSellTime" +
              robot_id +
              "= moment(settings.cl_time, 'HH:mm:ss');"
          );

          let now = moment().format("HH:mm:ss");
          let sell_time = moment(eval("gData.getSellTime" + robot_id)).format(
            "HH:mm:ss"
          );
          let closeTime = moment(getCloseTime).format("HH:mm:ss");

          // SELL BY TIME (ON)
          if (eval("gData.is_sell_by_time" + robot_id) == "true") {
            if (now >= sell_time) {
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : jobSecondary Settings stop()"
              );
              jobSecondaryS.stop();
            }
          } else {
            // SELL BY TIME (OFF)
            // TURN OFF ROBOT
            if (now >= closeTime) {
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : jobSecondary Settings stop()"
              );
              jobSecondaryS.stop();
            }
          }

          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : Secondary job Settings = ",
            secondaryS_GlobalIndex
          );
          secondaryS_GlobalIndex++;
        } else {
          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : runSecondaryJob jobSecondary Settings stop()"
          );
          jobSecondaryS.stop();
        }
      }
    });

    /**
     *  SECONDARY JOB
     *  Integrate Transaction
     */
    const jobSecondaryT = new CronJob("*/120 * * * * *", async function() {
      let time = moment().format("HH:mm:ss");
      let rest = await getRestTime(time);

      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Time = " +
          time +
          " Transaction"
      );
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Rest = " +
          rest +
          " Transaction"
      );

      if (!rest) {
        if (eval("gData.runSecondaryJob" + robot_id)) {
          try {
            // INNITIATION
            let now = moment().format("HH:mm:ss");
            let sell_time = moment(eval("gData.getSellTime" + robot_id)).format(
              "HH:mm:ss"
            );
            let closeTime = moment(getCloseTime).format("HH:mm:ss");

            // SELL BY TIME (ON)
            if (eval("gData.is_sell_by_time" + robot_id) == "true") {
              if (now >= sell_time) {
                console.log(
                  moment().format("YYYY-MM-DD HH:mm:ss") +
                    " Robot " +
                    robot_id +
                    " : jobSecondary Transaction stop()"
                );
                jobSecondaryT.stop();
              }
            } else {
              // SELL BY TIME (OFF)
              // TURN OFF ROBOT
              if (now >= closeTime) {
                console.log(
                  moment().format("YYYY-MM-DD HH:mm:ss") +
                    " Robot " +
                    robot_id +
                    " : jobSecondary Transaction stop()"
                );
                jobSecondaryT.stop();
              }
            }

            await automationTransaction(pageT, user_id, robot_id);
            await pageT.waitFor(5000);

            console.log(
              moment().format("YYYY-MM-DD HH:mm:ss") +
                " Robot " +
                robot_id +
                " : Secondary job Transaction = ",
              secondaryT_GlobalIndex
            );
            secondaryT_GlobalIndex++;
          } catch (error) {
            eval("gData.runSecondaryJob" + robot_id + "= false;");

            console.log(
              moment().format("YYYY-MM-DD HH:mm:ss") +
                " Robot " +
                robot_id +
                " : Error from Secondary Job() Transaction"
            );
          }
        } else {
          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : runSecondaryJob jobSecondary Transaction stop()"
          );
          jobSecondaryT.stop();

          let msg = eval("gData.errMsg" + robot_id);
          await closeErrorRobot(res, browser, msg, robot_id);
        }
      } else {
        // Refresh Page
        await refreshPageTransaction(pageT, robot_id);
      }
    });

    /**
     *  SECONDARY JOB
     *  Integrate Portfolio
     */
    const jobSecondaryP = new CronJob("*/120 * * * * *", async function() {
      let time = moment().format("HH:mm:ss");
      let rest = await getRestTime(time);

      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Time = " +
          time +
          " Portfolio"
      );
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Rest = " +
          rest +
          " Portfolio"
      );

      if (!rest) {
        if (eval("gData.runSecondaryJob" + robot_id)) {
          try {
            // INNITIATION
            let now = moment().format("HH:mm:ss");
            let sell_time = moment(eval("gData.getSellTime" + robot_id)).format(
              "HH:mm:ss"
            );
            let closeTime = moment(getCloseTime).format("HH:mm:ss");

            // SELL BY TIME (ON)
            if (eval("gData.is_sell_by_time" + robot_id) == "true") {
              if (now >= sell_time) {
                console.log(
                  moment().format("YYYY-MM-DD HH:mm:ss") +
                    " Robot " +
                    robot_id +
                    " : jobSecondary Portfolio stop()"
                );
                jobSecondaryP.stop();
              }
            } else {
              // SELL BY TIME (OFF)
              // TURN OFF ROBOT
              if (now >= closeTime) {
                console.log(
                  moment().format("YYYY-MM-DD HH:mm:ss") +
                    " Robot " +
                    robot_id +
                    " : jobSecondary Portfolio stop()"
                );
                jobSecondaryP.stop();
              }
            }

            let result = await automationPortofolio(
              pagePF,
              URL_protofolio,
              user_id,
              robot_id
            );
            await pagePF.waitFor(5000);

            if (result.length > 0) {
              eval("gData.thisPortfolio" + robot_id + "= result;");

              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : automationPortofolio = ",
                eval("gData.thisPortfolio" + robot_id)
              );
            }

            console.log(
              moment().format("YYYY-MM-DD HH:mm:ss") +
                " Robot " +
                robot_id +
                " : Secondary job PortFolio = ",
              secondaryP_GlobalIndex
            );
            secondaryP_GlobalIndex++;
          } catch (error) {
            eval("gData.runSecondaryJob" + robot_id + "= false;");

            console.log(
              moment().format("YYYY-MM-DD HH:mm:ss") +
                " Robot " +
                robot_id +
                " : Error from Secondary Job() Portfolio"
            );
          }
        } else {
          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : runSecondaryJob jobSecondary Portfolio stop()"
          );
          jobSecondaryP.stop();

          let msg = eval("gData.errMsg" + robot_id);
          await closeErrorRobot(res, browser, msg, robot_id);
        }
      } else {
        // Refresh Page
        await refreshPagePortofolio(pagePF, URL_protofolio, robot_id);
      }
    });

    /**
     *  SECONDARY JOB
     *  Integrate Stock Ranking
     */
    const jobSecondarySR = new CronJob("*/120 * * * * *", async function() {
      let time = moment().format("HH:mm:ss");
      let rest = await getRestTime(time);

      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Time = " +
          time +
          " Stock Ranking"
      );
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Rest = " +
          rest +
          " Stock Ranking"
      );

      if (!rest) {
        if (eval("gData.runSecondaryJob" + robot_id)) {
          // INNITIATION
          let now = moment().format("HH:mm:ss");
          let sell_time = moment(eval("gData.getSellTime" + robot_id)).format(
            "HH:mm:ss"
          );
          let closeTime = moment(getCloseTime).format("HH:mm:ss");

          // SELL BY TIME (ON)
          if (eval("gData.is_sell_by_time" + robot_id) == "true") {
            if (now >= sell_time) {
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : jobSecondary Stock Ranking stop()"
              );

              jobSecondarySR.stop();
            }
          } else {
            // SELL BY TIME (OFF)
            // TURN OFF ROBOT
            if (now >= closeTime) {
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : jobSecondary Stock Ranking stop()"
              );
              jobSecondarySR.stop();
            }
          }

          await inputStockRangking(pageSR);
          await pageSR.waitFor(5000);

          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : Secondary job Stock Ranking = ",
            secondarySR_GlobalIndex
          );
          secondarySR_GlobalIndex++;
        } else {
          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : runSecondaryJob jobSecondary Stock Ranking stop()"
          );
          jobSecondarySR.stop();
        }
      } else {
        // Refresh Page
        await refreshPageStockRangking(pageSR, robot_id);
      }
    });

    /**
     *  SECONDARY JOB
     *  Integrate Withdraws
     */
    const jobSecondaryW = new CronJob("*/120 * * * * *", async function() {
      let time = moment().format("HH:mm:ss");
      let rest = await getRestTime(time);

      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Time = " +
          time +
          " Withdraw"
      );
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Rest = " +
          rest +
          " Withdraw"
      );

      if (!rest) {
        if (eval("gData.runSecondaryJob" + robot_id)) {
          // INNITIATION
          let now = moment().format("HH:mm:ss");
          let sell_time = moment(eval("gData.getSellTime" + robot_id)).format(
            "HH:mm:ss"
          );
          let closeTime = moment(getCloseTime).format("HH:mm:ss");

          // SELL BY TIME (ON)
          if (eval("gData.is_sell_by_time" + robot_id) == "true") {
            if (now >= sell_time) {
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : jobSecondary Withdraws stop()"
              );
              jobSecondaryW.stop();
            }
          } else {
            // SELL BY TIME (OFF)
            // TURN OFF ROBOT
            if (now >= closeTime) {
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : jobSecondary Withdraws stop()"
              );
              jobSecondaryW.stop();
            }
          }

          await withdraws(pageWd, URL_accountinfo, robot_id, user_id);
          await pageWd.waitFor(5000);

          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : Secondary job Withdraws = ",
            secondaryW_GlobalIndex
          );
          secondaryW_GlobalIndex++;
        } else {
          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : runSecondaryJob jobSecondary Withdraws stop()"
          );
          jobSecondaryW.stop();
        }
      } else {
        await refreshPageWithdraws(pageWd, URL_accountinfo, robot_id);
      }
    });

    /**
     *  VALIDATE INITIATION BUY TIME
     *
     *  transaction cycle will run after initiation buy
     */
    const isMoreThanBuyTime = new CronJob("*/30 * * * * *", async function() {
      // let time = moment().format("HH:mm:ss");
      // let rest = await getRestTime(time);

      // console.log(
      //   moment().format("YYYY-MM-DD HH:mm:ss") +
      //     " Robot " +
      //     robot_id +
      //     " Time = " +
      //     time +
      //     " Go to buy time"
      // );
      // console.log(
      //   moment().format("YYYY-MM-DD HH:mm:ss") +
      //     " Robot " +
      //     robot_id +
      //     " Rest = " +
      //     rest +
      //     " Go to buy time"
      // );

      // if (!rest) {
      // }

      if (eval("gData.runSecondaryJob" + robot_id)) {
        let now = moment().format("HH:mm:ss");
        let getBuyTime = moment(settings.buy_time, "HH:mm:ss");
        let buy_time = moment(getBuyTime).format("HH:mm:ss");

        console.log(
          moment().format("YYYY-MM-DD HH:mm:ss") +
            " Robot " +
            robot_id +
            " : now",
          now
        );
        console.log(
          moment().format("YYYY-MM-DD HH:mm:ss") +
            " Robot " +
            robot_id +
            " : buy_time",
          buy_time
        );

        if (now >= buy_time) {
          isMoreThanBuyTime.stop();

          let lastInit = await getLastInitBuysSells(user_id);

          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : lastInit length",
            lastInit.length
          );

          if (lastInit.length == 0) {
            // lastinit length == 0
            // get all stock for custom
            if (stock_mode_id == "custom") {
              stock_mode_id = "okjz6if";
            }

            let initBuyData = await getInitBuyDataStock(
              price_type,
              stock_value_data,
              stock_mode_id,
              robot_id,
              settings,
              user_id
            );

            console.log(
              moment().format("YYYY-MM-DD HH:mm:ss") +
                " Robot " +
                robot_id +
                " : isMoreThanBuyTime",
              initBuyData
            );

            let dataInitBuyStock = await setInitBuyStock(
              initBuyData,
              user_id,
              dana_per_stock,
              level_per_stock,
              spreadPerLevel,
              robot_id
            );

            console.log("dataInitBuyStock = ", dataInitBuyStock);

            await main(
              res,
              page,
              pageTrx,
              pagePF,
              pageSR,
              pageWd,
              browser,
              user_id,
              settings,
              robot_id,
              URL_protofolio,
              thisUser,
              URL_accountinfo,
              spreadPerLevel,
              clValue,
              profitPerLevel,
              dataInitBuyStock,
              URL_runningTrade
            );
          } else {
            // lastinit length > 0

            let dataInitBuyStock = [];

            console.log("dataInitBuyStock = ", dataInitBuyStock);

            await main(
              res,
              page,
              pageTrx,
              pagePF,
              pageSR,
              pageWd,
              browser,
              user_id,
              settings,
              robot_id,
              URL_protofolio,
              thisUser,
              URL_accountinfo,
              spreadPerLevel,
              clValue,
              profitPerLevel,
              dataInitBuyStock,
              URL_runningTrade
            );
          }
        }
      } else {
        console.log(
          moment().format("YYYY-MM-DD HH:mm:ss") +
            " Robot " +
            robot_id +
            " : runSecondaryJob jobSecondary isMoreThanBuyTime stop()"
        );
        isMoreThanBuyTime.stop();
      }
    });

    /** FOR TEST GLOBAL VARIABLE */
    // const jobSecondaryTest = new CronJob("*/1 * * * * *", async function() {
    //   console.log(
    //     moment().format("YYYY-MM-DD HH:mm:ss") +
    //       " Robot " +
    //       robot_id +
    //       " : Secondary job Withdraws = ",
    //     eval("gData.index" + robot_id)
    //   );
    //   eval("gData.index" + robot_id + "++");
    // });

    jobSecondaryS.start();
    jobSecondaryP.start();
    jobSecondarySR.start();
    jobSecondaryW.start();
    jobSecondaryT.start();
    isMoreThanBuyTime.start();

    /** FOR TEST GLOBAL VARIABLE */
    // jobSecondaryTest.start();

    /** END */
    return res.json({
      success: 1,
      message: "Robot sudah berjalan."
    });
  } catch (error) {
    let msg = "Gagal terhubung dengan RHB";
    await closeErrorRobotBeforeLogin(res, browser, msg, robot_id);
  }
};

// get rest time rhb
async function getRestTime(time) {
  let now = time;

  /**
   * FOR TEST
   *
   * let date = moment("2020-01-24", "YYYY-MM-DD");
   * let weekDay = moment(date).format("dddd");
   */

  let weekDay = moment().format("dddd");

  let getStartRestTime = moment("12:00:00", "HH:mm:ss");
  let getEndRestTime = moment("13:30:00", "HH:mm:ss");

  if (weekDay == "Friday") {
    getStartRestTime = moment("11:30:00", "HH:mm:ss");
    getEndRestTime = moment("14:00:00", "HH:mm:ss");
  }

  let startRestTime = moment(getStartRestTime).format("HH:mm:ss");
  let endRestTime = moment(getEndRestTime).format("HH:mm:ss");

  if (now >= startRestTime && now <= endRestTime) {
    return true;
  } else {
    return false;
  }
}

// get data stock from google spreadsheet
async function getStockFromSheet(stockModeId) {
  let baseURL = process.env.API_URL;
  let method = "stocks/" + stockModeId;
  let endpoint = baseURL + "" + method;

  let data = [];

  console.log("endpoint", endpoint);

  let result = axios
    .get(endpoint)
    .then(function(response) {
      console.log("response", response.data);

      data = response.data.data;
    })
    .catch(async function(error) {
      console.log("error.responsenya", error.response);
    });

  console.log("result", await result);

  return data;
}

// create object for stock name and price
async function getInitBuyDataStock(
  price_type,
  stock_value_data,
  stock_mode_id,
  robot_id,
  settings,
  user_id
) {
  // id stock all (for custom) = okjz6if
  let stockFromSheet = await getStockFromSheet(stock_mode_id);
  let currentBuyStock = await getInitBuyStock(user_id);

  let initBuyDataStock = [];
  let insertStockToDb = [];
  let filterStockFromSheet = [];

  let stockMode = settings.stock_mode;
  let maxStock = parseInt(settings.max_stock);
  let minValue = parseInt(settings.min_value);
  let stockValue = "";
  let separator = ",";

  let isCurrentBuyStock = false;

  console.log("stockFromSheet = ", stockFromSheet);
  console.log("settings = ", settings);

  // Check For Stock
  // current stock is exists
  if (currentBuyStock.length > 0) {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : getInitBuyDataStock currentBuyStock.length = ",
      currentBuyStock.length
    );

    // trigger current buy stock is exists
    isCurrentBuyStock = true;

    currentBuyStock.forEach(cbs => {
      initBuyDataStock.push({
        user_id: user_id,
        stock: cbs.stock,
        mode: cbs.mode,
        price: cbs.price,
        lots: cbs.lots
      });
    });

    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : initBuyDataStock",
      initBuyDataStock
    );

    return (data = {
      initBuyDataStock,
      isCurrentBuyStock
    });
  } else {
    // current stock not exists
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : getInitBuyDataStock currentBuyStock.length = ",
      currentBuyStock.length
    );
    // Stock Criteria is not Custom
    if (stockMode != "okjz6if") {
      filterStockFromSheet = stockFromSheet
        .filter(el => {
          let stockValue = parseInt(el.value.replace(/\./g, ""));
          return minValue <= stockValue;
        })
        .splice(0, maxStock);

      if (filterStockFromSheet.length > 0) {
        filterStockFromSheet.forEach(sfs => {
          let stock = sfs.stock;
          let price = "";

          if (price_type == "open") {
            price = sfs.open.replace(".", "");
          }
          if (price_type == "close") {
            price = sfs.close.replace(".", "");
          }
          if (price_type == "prev") {
            price = sfs.prev_close.replace(".", "");
          }

          stockValue = stockValue.concat(stock);
          stockValue = stockValue.concat(separator);

          initBuyDataStock.push({
            stock,
            price_type,
            price: price
          });
        });

        console.log(
          moment().format("YYYY-MM-DD HH:mm:ss") +
            " Robot " +
            robot_id +
            " : initBuyDataStock",
          initBuyDataStock
        );

        settings.stock_value = stockValue.slice(0, -1);

        await setSettings(user_id, settings);

        return (data = {
          initBuyDataStock,
          isCurrentBuyStock
        });
      }
    } else {
      // Stock Criteria is Custom
      stock_value_data.forEach(el => {
        filterStockFromSheet = stockFromSheet.filter(sfs => sfs.stock == el);

        if (filterStockFromSheet.length > 0) {
          let stock = filterStockFromSheet[0].stock;
          let price = "";

          if (price_type == "open") {
            price = filterStockFromSheet[0].open.replace(".", "");
          }
          if (price_type == "close") {
            price = filterStockFromSheet[0].close.replace(".", "");
          }
          if (price_type == "prev") {
            price = filterStockFromSheet[0].prev_close.replace(".", "");
          }

          initBuyDataStock.push({
            stock,
            price_type,
            price: price
          });
        }
      });

      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : initBuyDataStock",
        initBuyDataStock
      );

      return (data = {
        initBuyDataStock,
        isCurrentBuyStock
      });
    }
  }
}

// get init buy data which has prepare for execute initiation buy
async function setInitBuyStock(
  initBuyData,
  user_id,
  stockBudget,
  level_per_stock,
  spreadPerLevel,
  robot_id
) {
  let currentBuyStock = await getInitBuyStock(user_id);

  let initBuyDataStock = initBuyData.initBuyDataStock;
  let isCurrentBuyStock = initBuyData.isCurrentBuyStock;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : currentBuyStock = ",
    currentBuyStock
  );

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : currentBuyStock.length = ",
    currentBuyStock.length
  );

  let now = moment().format("YYYY-MM-DD HH:mm:ss");
  let startDate = moment().format("YYYY-MM-DD 00:00:00");
  let EndDate = moment().format("YYYY-MM-DD 23:59:00");
  let level = level_per_stock;
  let insertStockToDb = [];

  // current buy stock is exists
  if (isCurrentBuyStock == true) {
    initBuyDataStock.forEach(ibds => {
      insertStockToDb.push({
        user_id: ibds.user_id,
        order_date: now,
        stock: ibds.stock,
        mode: "Buy",
        price: ibds.price.toString(),
        lots: ibds.lots.toString()
      });
    });
  } else {
    // current buy stock is not exists
    for (let i = 0; i < initBuyDataStock.length; i++) {
      let stock = initBuyDataStock[i].stock;
      let priceData = initBuyDataStock[i].price;

      let price = await getBuyPrice(level, spreadPerLevel, priceData);

      for (let idx = 0; idx < level; idx++) {
        let lots = await getLot(stockBudget, level, price[idx], robot_id);

        insertStockToDb.push({
          user_id: user_id,
          order_date: now,
          stock,
          mode: "Buy",
          price: price[idx],
          lots
        });
      }
    }
  }

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : setInitBuyStock insertStockToDb",
    insertStockToDb
  );

  let err, getInitBuyStockData, initBuyStock;

  if (currentBuyStock.length > 0) {
    let dataInit = [];
    insertStockToDb.forEach(async el => {
      let data = currentBuyStock.filter(cbs => {
        return (
          cbs.user_id == el.user_id &&
          cbs.stock == el.stock &&
          cbs.mode == el.mode &&
          cbs.price == el.price &&
          cbs.lots == el.lots
        );
      });

      if (data.length < 1) {
        console.log(
          moment().format("YYYY-MM-DD HH:mm:ss") +
            " Robot " +
            robot_id +
            " : filter.length < 1"
        );
        dataInit.push(el);
        [err, initBuyStock] = await to(Check_Init_Buy.create(el));
      } else if (data[0].on_submit == "no") {
        console.log(
          moment().format("YYYY-MM-DD HH:mm:ss") +
            " Robot " +
            robot_id +
            " : on_submit == no"
        );
        dataInit.push(el);
      }
    });

    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : dataInit = ",
      dataInit
    );

    return dataInit;
  } else {
    insertStockToDb.forEach(async el => {
      let stock = el.stock;
      let mode = el.mode;
      let price = el.price;
      let lots = el.lots;

      [err, getInitBuyStockData] = await to(
        Check_Init_Buy.findOne({
          where: {
            user_id,
            stock,
            mode,
            price,
            lots,
            createdAt: {
              [Op.gte]: startDate,
              [Op.lt]: EndDate
            }
          }
        })
      );

      if (!getInitBuyStockData) {
        [err, initBuyStock] = await to(Check_Init_Buy.create(el));
      }
    });

    return insertStockToDb;
  }
}

// get init buy data from db
async function getInitBuyStock(user_id) {
  let startDate = moment().format("YYYY-MM-DD 00:00:00");
  let EndDate = moment().format("YYYY-MM-DD 23:59:00");
  [err, initBuyStock] = await to(
    Check_Init_Buy.findAll({
      where: {
        user_id,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: EndDate
        }
      }
    })
  );

  return initBuyStock;
}

// update initiation buy data set on submit = yes (sell buy time yes)
async function updateInitData(user_id, stock, price, lots, mode) {
  let dataInit, err;
  let startDate = moment().format("YYYY-MM-DD 00:00:00");
  let EndDate = moment().format("YYYY-MM-DD 23:59:00");

  [err, dataInit] = await to(
    Check_Init_Buy.findOne({
      where: {
        user_id,
        stock,
        mode,
        price,
        lots,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: EndDate
        }
      }
    })
  );

  if (dataInit) {
    let update = {
      on_submit: "Yes",
      updatedAt: moment().format("YYYY-MM-DD 23:59:00")
    };

    dataInit.set(update);
    [err, dataInit] = await to(dataInit.save());
  }
}

// update initiation buy data set on submit = yes (sell buy time no)
async function updateInitDataSellTimeOff(id, user_id) {
  let dataInit, err;

  [err, dataInit] = await to(
    Init_Buy.findOne({
      where: {
        id,
        user_id
      }
    })
  );

  if (dataInit) {
    let update = {
      on_submit: "Yes",
      updatedAt: moment().format("YYYY-MM-DD 23:59:00")
    };

    dataInit.set(update);
    [err, dataInit] = await to(dataInit.save());
  }
}

// main automation
async function main(
  res,
  page,
  pageTrx,
  pagePF,
  pageSR,
  pageWd,
  browser,
  user_id,
  settings,
  robot_id,
  URL_protofolio,
  thisUser,
  URL_accountinfo,
  spreadPerLevel,
  clValue,
  profitPerLevel,
  dataInitBuyStock,
  URL_runningTrade
) {
  let mainExec = [];

  if (settings.is_sell_by_time == "true") {
    // AUTOMATION INITIATION BUY (is_sell_by_time == true)
    mainExec[0] = await automationInitBuys(
      page,
      robot_id,
      dataInitBuyStock,
      user_id
    );
  } else {
    // AUTOMATION INITIATION BUY (is_sell_by_time == false)
    mainExec[0] = await automationInitBuysSellTimeFalse(
      page,
      robot_id,
      dataInitBuyStock,
      user_id
    );
  }

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : main thisInitBuy = ",
    eval("gData.thisInitBuy" + robot_id)
  );

  mainExec[1] = await page.waitFor(5000);
  // AUTOMATION
  mainExec[2] = await automation(
    res,
    page,
    pageTrx,
    pagePF,
    pageSR,
    pageWd,
    browser,
    user_id,
    settings,
    robot_id,
    URL_protofolio,
    thisUser,
    URL_accountinfo,
    clValue,
    profitPerLevel,
    spreadPerLevel,
    URL_runningTrade
  );

  Promise.all(mainExec).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : automationInitBuys automation finish!!!"
    );
  });

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : main automation"
  );
}

// automation
async function automation(
  res,
  page,
  pageTrx,
  pagePF,
  pageSR, //DEPRECATED
  pageWd, //DEPRECATED
  browser,
  user_id,
  settings,
  robot_id,
  URL_protofolio,
  thisUser, //DEPRECATED
  URL_accountinfo, //DEPRECATED
  clValue,
  profitPerLevel,
  spreadPerLevel,
  URL_runningTrade
) {
  let globalIndex = 0;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : automation thisInitBuy = ",
    eval("gData.thisInitBuy" + robot_id)
  );

  // initiation buy success
  if (eval("gData.thisInitBuy" + robot_id) == true) {
    // MAIN JOB
    const job = new CronJob("*/120 * * * * *", async function() {
      let time = moment().format("HH:mm:ss");
      let rest = await getRestTime(time);

      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Time = " +
          time +
          " Main Job"
      );
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " Rest = " +
          rest +
          " Main Job"
      );

      if (!rest) {
        /**
         * trigger for MAIN JOB
         * if SECONDARY JOB has error, MAIN JOB must stop()
         */
        if (eval("gData.runSecondaryJob" + robot_id)) {
          try {
            // INNITIATION
            let now = moment().format("HH:mm:ss");
            let sell_time = moment(eval("gData.getSellTime" + robot_id)).format(
              "HH:mm:ss"
            );

            let closeTime = moment(getCloseTime).format("HH:mm:ss");

            // SET / UPDATE DATA TO TUMI DATABASE
            let transaction = await setTransactionData(
              pageTrx,
              user_id,
              spreadPerLevel,
              robot_id
            );
            await page.waitFor(5000);

            console.log(
              moment().format("YYYY-MM-DD HH:mm:ss") +
                " Robot " +
                robot_id +
                " : transactionData",
              transaction
            );

            let matchStockBuy = transaction.matchStockBuy;
            let matchStockSell = transaction.matchStockSell;
            let openStockBuy = transaction.openStockBuy;
            let openStockSell = transaction.openStockSell;

            let openStock = transaction.openStock;

            // REFRESH PAGE
            if (matchStockBuy.length == 0 && matchStockSell.length == 0) {
              await page.goto(URL_runningTrade);
            }

            // AUTOMATION SELL
            if (matchStockBuy.length > 0) {
              await automationSells(page, matchStockBuy, robot_id, user_id);
            }

            // AUTOMATION BUY
            if (matchStockSell.length > 0) {
              await automationBuys(page, matchStockSell, robot_id, user_id);
            }

            // SELL BY TIME (ON)
            if (eval("gData.is_sell_by_time" + robot_id) == "true") {
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : now = ",
                now
              );
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : sell time = ",
                sell_time
              );
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : openStockSell = ",
                openStockSell
              );
              if (now >= sell_time) {
                job.stop();
                msg = "Robot telah selesai dengan sell time (sell by time yes)";

                let execSellTimeTrue = [];
                execSellTimeTrue[0] = await sellByTimeOnTrigger(
                  page,
                  user_id,
                  openStockSell,
                  openStock,
                  robot_id
                );
                execSellTimeTrue[1] = await page.waitFor(10000);
                execSellTimeTrue[2] = await setOffRobotStatus(robot_id, msg);
                execSellTimeTrue[3] = await page.waitFor(5000);
                execSellTimeTrue[4] = await browser.close();
                Promise.all(execSellTimeTrue).then(() => {
                  console.log(
                    "Robot " +
                      robot_id +
                      " : sellByTimeTrigger setTransactionData setOffRobotStatus finish!!!"
                  );
                });
              }
            } else {
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : now = ",
                now
              );
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : closeTime = ",
                closeTime
              );
              console.log(
                moment().format("YYYY-MM-DD HH:mm:ss") +
                  " Robot " +
                  robot_id +
                  " : Sell by time off trigger"
              );
              // SELL BY TIME (OFF)
              await sellByTimeOffTrigger(
                page,
                pagePF,
                URL_protofolio,
                user_id,
                clValue,
                profitPerLevel,
                openStock,
                robot_id
              );

              // TURN OFF ROBOT
              if (now >= closeTime) {
                job.stop();

                let msg =
                  "Robot telah selesai dengan close time (sell by time no).";
                let exec = [];

                exec[0] = await setInitBuySell(pageTrx, user_id, robot_id);
                exec[1] = await pageTrx.waitFor(5000);
                exec[2] = await setOffRobotStatus(robot_id, msg);
                exec[3] = await page.waitFor(5000);
                exec[4] = await browser.close();

                Promise.all(exec).then(() => {
                  console.log(
                    moment().format("YYYY-MM-DD HH:mm:ss") +
                      " Robot " +
                      robot_id +
                      " : setInitBuySell setTransactionData setOffRobotStatus finish!!!"
                  );
                });
              }
            }

            console.log(
              moment().format("YYYY-MM-DD HH:mm:ss") +
                " Robot " +
                robot_id +
                " : Main job globalIndex = ",
              globalIndex
            );
            globalIndex++;
          } catch (error) {
            /**
             * trigger for SECONDARY JOB
             * if MAIN JOB has error, SECONDARY JOB must stop()
             */
            eval("gData.runSecondaryJob" + robot_id + "= false;");

            console.log(
              moment().format("YYYY-MM-DD HH:mm:ss") +
                " Robot " +
                robot_id +
                " : Error from Main Job()"
            );

            job.stop();

            let msg = eval("gData.errMsg" + robot_id);
            await closeErrorRobot(res, browser, msg, robot_id);
          }
        } else {
          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : mainJob stop()"
          );
          job.stop();
        }
      } else {
        // Refresh Page
        await refreshPageMainJob(page, pageTrx, URL_runningTrade, robot_id);
      }
    });

    job.start();
  } else {
    // initiation buy failed
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : initiation buy failed"
    );

    let msg = "Gagal initiation buy";
    await setRobotStatusInitFail(robot_id, msg);

    const jobFailInitBuy = new CronJob("*/120 * * * * *", async function() {
      // INNITIATION
      let now = moment().format("HH:mm:ss");

      let closeTime = moment(getCloseTime).format("HH:mm:ss");

      // TURN OFF ROBOT
      if (now >= closeTime) {
        jobFailInitBuy.stop();

        let msg = "Robot telah selesai namun gagal initiation buy.";
        let exec = [];

        exec[0] = await setOffRobotStatus(robot_id, msg);
        exec[1] = await page.waitFor(5000);
        exec[2] = await browser.close();

        Promise.all(exec).then(() => {
          console.log("Robot " + robot_id + " : setOffRobotStatus finish!!!");
        });
      }

      console.log(
        moment().format("HH:mm:ss") +
          " Robot " +
          robot_id +
          " : jobFailInitBuy globalIndex = ",
        globalIndex
      );
      globalIndex++;
    });

    jobFailInitBuy.start();
  }
}

// automation initiation buys (is_sell_by_time == true)
async function automationInitBuys(page, robot_id, dataInitBuyStock, user_id) {
  let stocksInitBuy = [];
  for (let i = 0; i < dataInitBuyStock.length; i++) {
    stocksInitBuy.push(
      await stockInitBuy(page, dataInitBuyStock[i], robot_id, user_id)
    );
  }

  // run initiation buy stock
  Promise.all(stocksInitBuy).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : finish initiation buy!!!"
    );
  });
}

// automation initiation buys  (is_sell_by_time == false)
async function automationInitBuysSellTimeFalse(
  page,
  robot_id,
  dataInitBuyStock,
  user_id
) {
  let lastInit = await getLastInitBuysSells(user_id);
  let stocksInitSell = [];
  let stocksInitBuy = [];

  // init stock
  if (lastInit.length > 0) {
    for (let i = 0; i < lastInit.length; i++) {
      if (lastInit[i].mode == "Buy" && lastInit[i].on_submit == "no") {
        stocksInitBuy.push(
          await stockInitBuySellTimeOff(page, lastInit[i], robot_id, user_id)
        );
      }

      if (lastInit[i].mode == "Sell" && lastInit[i].on_submit == "no") {
        stocksInitSell.push(
          await stockInitSellSellTimeOff(page, lastInit[i], robot_id, user_id)
        );
      }
    }
  } else {
    for (let i = 0; i < dataInitBuyStock.length; i++) {
      stocksInitBuy.push(
        await stockInitBuy(page, dataInitBuyStock[i], robot_id, user_id)
      );
    }
  }

  // run initiation buy stock
  Promise.all(stocksInitSell).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : finish initiation sell (sell by time off) !!!"
    );
  });

  // run initiation buy stock
  Promise.all(stocksInitBuy).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : finish initiation buy (sell by time off) !!!"
    );
  });
}

// automation sells
async function automationSells(page, matchStockBuys, robot_id, user_id) {
  let dataStockSell = await matchStockBuys;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : dataStockSell",
    dataStockSell
  );

  // set data stock sell
  let dataDB = [];

  dataDB[0] = setStockSell(dataStockSell, robot_id);
  dataDB[1] = await page.waitFor(2000);
  dataDB[2] = getStockSell(user_id);
  dataDB[3] = console.log(
    "Robot " + robot_id + " : getStockSell",
    await dataDB[2]
  );
  dataDB[4] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log(
      "Robot " + robot_id + " : setStockSell getStockSell finish!!!",
      dataDB[2]
    );
  });

  let getDataStockSell = await dataDB[2];

  if ((await getDataStockSell.length) > 0) {
    let stocksSell = [];
    for (let i = 0; i < (await getDataStockSell.length); i++) {
      stocksSell.push(
        await stockSell(page, await getDataStockSell[i], robot_id)
      );
      await updateStockTransaction(await getDataStockSell[i]);
    }

    // run sell stock
    Promise.all(stocksSell).then(() => {
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : stocksSell finish!!!"
      );
    });
  }
}

// automation buys
async function automationBuys(page, matchStockSells, robot_id, user_id) {
  let dataStockBuy = await matchStockSells;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : dataStockBuy",
    dataStockBuy
  );

  // set data stock buy
  let dataDB = [];

  dataDB[0] = setStockBuy(dataStockBuy, robot_id);
  dataDB[1] = await page.waitFor(2000);
  dataDB[2] = getStockBuy(user_id);
  dataDB[3] = console.log(
    "Robot " + robot_id + " : getStockBuy",
    await dataDB[2]
  );
  dataDB[4] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log(
      "Robot " + robot_id + " : setStockBuy getStockBuy finish!!!",
      dataDB[2]
    );
  });

  let getDataStockBuy = await dataDB[2];

  if ((await getDataStockBuy.length) > 0) {
    let stocksBuy = [];
    for (let i = 0; i < (await getDataStockBuy.length); i++) {
      stocksBuy.push(await stockBuy(page, await getDataStockBuy[i], robot_id));
      await updateStockTransaction(await getDataStockBuy[i]);
    }

    // run buy stock
    Promise.all(stocksBuy).then(() => {
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : stocksBuy finish!!!"
      );
    });
  }
}

// automation sells by time on
async function automationSellByTimes(page, openStockSells, user_id, robot_id) {
  let dataStockSellByTime = openStockSells;

  let dataDB = [];

  dataDB[0] = setStockSell(dataStockSellByTime, robot_id);
  dataDB[1] = await page.waitFor(2000);
  dataDB[2] = getStockSellByTime(user_id);
  dataDB[3] = console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : dataDB",
    await dataDB[2]
  );
  dataDB[4] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log(
      "Robot " + robot_id + " : setStockSell getStockSellByTime finish!!!"
    );
  });

  let dataSellStock = await dataDB[2];
  if (dataSellStock.length > 0) {
    let stocksSellByTime = [];
    for (let i = 0; i < (await dataSellStock.length); i++) {
      stocksSellByTime.push(
        await stockSellByTime(page, await dataSellStock[i], robot_id)
      );
      await updateStockTransaction(await dataSellStock[i]);
    }

    // run sell stock
    Promise.all(stocksSellByTime).then(() => {
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : stocksSellByTime finish!!!"
      );
    });
  }
}

// automation sells by time off
async function automationSellByTimesOff(
  page,
  openStockSells,
  user_id,
  robot_id
) {
  let dataStockSellByTime = openStockSells;

  let dataDB = [];

  dataDB[0] = setStockSell(dataStockSellByTime, robot_id);
  dataDB[1] = await page.waitFor(2000);
  dataDB[2] = getStockSellByTime(user_id);
  dataDB[3] = console.log(
    "Robot " + robot_id + " : getStockSellByTime",
    await dataDB[2]
  );
  dataDB[4] = await page.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log(
      "Robot " + robot_id + " : setStockSell getStockSellByTime finish!!!"
    );
  });

  let dataSellStock = await dataDB[2];

  if (dataSellStock.length > 0) {
    let stocksSellByTime = [];
    for (let i = 0; i < (await dataSellStock.length); i++) {
      stocksSellByTime.push(
        await stockSellByTimeOff(page, await dataSellStock[i], robot_id)
      );
      await updateStockTransaction(await dataSellStock[i]);
    }

    // run sell stock
    Promise.all(stocksSellByTime).then(() => {
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : stocksSellByTime finish!!!"
      );
    });
  }
}

// automation withdraw stock sell (sell by time on)
async function automationWithdrawStockSell(page, withdrawData, robot_id) {
  let data = await withdrawData;
  if (data.length > 0) {
    let withdrawStockSell = [];

    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].mode == "Sell") {
        withdrawStockSell.push(
          await setWithdrawStockSell(page, await data[i], i, robot_id)
        );
      }
    }

    // run withdraw stock
    Promise.all(withdrawStockSell).then(() => {
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : withdrawStockSell finish!!!"
      );
    });
  }
}

// automation withdraw stock sell (sell by time off)
async function automationWithdrawStockSellOff(page, withdrawData, robot_id) {
  let data = await withdrawData;
  if (data.length > 0) {
    let withdrawStockSell = [];

    for (let i = data.length - 1; i >= 0; i--) {
      withdrawStockSell.push(
        await setWithdrawStockSell(page, await data[i], data[i].index, robot_id)
      );
    }

    // run withdraw stock
    Promise.all(withdrawStockSell).then(() => {
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : withdrawStockSell finish!!!"
      );
    });
  }
}

// set automation withdraw rhb
async function automationSetWithdrawRhb(
  pageWd,
  URL_accountinfo,
  robot_id,
  user_id
) {
  let dataDB = [];

  dataDB[0] = getWithdrawData(user_id);
  dataDB[1] = console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : getWithdrawData",
    await dataDB[0]
  );
  dataDB[2] = await pageWd.waitFor(2000);

  Promise.all(dataDB).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : getWithdrawData finish!!!"
    );
  });

  let requrstWithdraw = await dataDB[0];

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : requrstWithdraw",
    await requrstWithdraw.length
  );

  if (requrstWithdraw.length > 0) {
    let execWithdraw = [];
    for (let i = 0; i < (await requrstWithdraw.length); i++) {
      execWithdraw.push(
        await setWithdrawRhb(pageWd, URL_accountinfo, await requrstWithdraw[i])
      );
      await updateWithdrawData(await requrstWithdraw[i]);
    }

    // run sell stock
    Promise.all(execWithdraw).then(() => {
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : execWithdraw finish!!!"
      );
    });
  }
}

// sell by time on trigger
async function sellByTimeOnTrigger(
  page,
  user_id,
  openStockSell,
  openStock,
  robot_id
) {
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
      await automationWithdrawStockSell(page, mapWithdrawStockSell, robot_id);
    }

    if (openStockSells.length > 0) {
      await automationSellByTimes(page, openStockSells, user_id, robot_id);
    }
  }
}

// sell by time off trigger
async function sellByTimeOffTrigger(
  page,
  pagePF,
  URL_protofolio, //DEPRECATED
  user_id,
  clValue,
  profitPerLevel,
  openStock,
  robot_id
) {
  let data = eval("gData.thisPortfolio" + robot_id);

  await pagePF.waitFor(1000);

  if (data.length > 0) {
    let filterStockProtofolio = await data.table.map(el => ({
      stock: el.stock,
      last: el.last.replace(",", "")
    }));

    // get open stock
    let stockOpen = await openStock;

    if (stockOpen.length > 0) {
      let mapStockOpen = stockOpen.map((el, i) => ({
        ...el,
        index: i
      }));

      mapStockOpen.forEach((el, i) => {
        let dataLast = filterStockProtofolio.filter(
          fsp => fsp.stock == el.stock
        );
        let price = parseInt(el.price);
        let condition = "Normal";

        el.last = parseInt(dataLast[0].last);
        el.cl = Math.round(price - (price * clValue) / 100);
        el.tp = Math.round(price + (price * profitPerLevel) / 100);

        if (el.mode == "Sell") {
          // condition
          if (el.last >= el.tp) {
            condition = "TARGET PROFIT";
          } else if (el.last < el.cl) {
            condition = "CUT LOST";
          }

          // log detail price
          console.log(
            moment().format("YYYY-MM-DD HH:mm:ss") +
              " Robot " +
              robot_id +
              " : Stock " +
              el.stock +
              " | price " +
              el.price +
              " | last : " +
              el.last +
              " | tp : " +
              el.tp +
              " | cl : " +
              el.cl +
              " | condition : " +
              condition
          );
        }
      });

      // get tp or cl
      let tpclStock = await getTpClStock(mapStockOpen, user_id);

      if (tpclStock.length > 0) {
        let tpclStockSell = tpclStock.filter(el => {
          return el.mode == "Sell";
        });

        if (tpclStockSell.length > 0) {
          await automationWithdrawStockSellOff(page, tpclStockSell, robot_id);

          await page.waitFor(2000);

          await automationSellByTimesOff(
            page,
            tpclStockSell,
            user_id,
            robot_id
          );
        }
      }
    }
  }
}

// set init buy stocks (sell by time == true)
async function stockInitBuy(page, dataInitBuyStock, robot_id, user_id) {
  const URL_orderpad_buy =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?buy";

  let stock = dataInitBuyStock.stock;
  let price = dataInitBuyStock.price;
  let lots = dataInitBuyStock.lots;
  let mode = "Buy";

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : stock ",
    stock
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : price ",
    price
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : lots ",
    lots
  );
  await page.goto(URL_orderpad_buy);
  await page.type("input[id='_stockCode']", stock);

  if (price != "NaN") {
    if (parseInt(price) >= 50) {
      await page.type("input[id='_price']", price);
      await page.type("input[id='_volume']", lots);
      await page.click("button[id='_enter']");
      await page.waitFor(1000);
      await page.click("button[id='_confirm']");
      await page.waitFor(1000);
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : =-=-=-=-=BUY=-=-=-=-=",
        parseInt(price)
      );
      await updateInitData(user_id, stock, price, lots, mode);
    }
  } else {
    /** DEPRECATED */
    // trigger error initiation buy
    // thisInitBuy = false;
  }

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : finish"
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : ##############################################"
  );

  return await page.waitFor(1000);
}

// set init buy stocks (sell by time == false)
async function stockInitBuySellTimeOff(page, lastInit, robot_id, user_id) {
  const URL_orderpad_buy =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?buy";

  let id = lastInit.id;
  let stock = lastInit.stock;
  let price = lastInit.price.toString();
  let lots = lastInit.lots.toString();

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : stock ",
    stock
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : price ",
    price
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : lot ",
    lots
  );

  if (parseInt(price) >= 50) {
    await page.goto(URL_orderpad_buy);
    await page.type("input[id='_stockCode']", stock);

    await page.type("input[id='_price']", price);
    await page.type("input[id='_volume']", lots);
    await page.click("button[id='_enter']");
    await page.waitFor(1000);
    await page.click("button[id='_confirm']");
    await page.waitFor(1000);
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : =-=-=-=-=BUY INIT=-=-=-=-=",
      parseInt(price)
    );
    await updateInitDataSellTimeOff(id, user_id);
  }

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : finish"
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : ##############################################"
  );

  return await page.waitFor(3000);
}

// set init sell stocks (sell by time == false)
async function stockInitSellSellTimeOff(page, lastInit, robot_id, user_id) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";

  let id = lastInit.id;
  let stock = lastInit.stock;
  let price = lastInit.price.toString();
  let lots = lastInit.lots.toString();

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : stock ",
    stock
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : price ",
    price
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : lot ",
    lots
  );

  if (parseInt(price) >= 50) {
    await page.goto(URL_orderpad_sell);
    await page.type("input[id='_stockCode']", stock);

    await page.type("input[id='_price']", price);
    await page.type("input[id='_volume']", lots);
    await page.click("button[id='_enter']");
    await page.waitFor(1000);
    await page.click("button[id='_confirm']");
    await page.waitFor(1000);
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : =-=-=-=-=SELL INIT=-=-=-=-=",
      parseInt(price)
    );
    await updateInitDataSellTimeOff(id, user_id);
  }

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : finish"
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : ##############################################"
  );

  return await page.waitFor(3000);
}

// set sell stocks
async function stockSell(page, dataStockSell, robot_id) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";
  let stock = dataStockSell.stock;
  let priceSell = dataStockSell.priceSell.replace(",", "");
  let priceBuy = dataStockSell.priceBuy.replace(",", "");
  let lots = dataStockSell.lots;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : stock ",
    stock
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : priceBuy ",
    priceBuy
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : priceSell ",
    priceSell
  );

  if (parseInt(priceSell) >= 50) {
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
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : =-=-=-=-=SELL=-=-=-=-=",
      priceSell
    );
  }

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : finish"
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : #############################################S"
  );

  return await page.waitFor(1000);
}

// set sell stocks by time on
async function stockSellByTime(page, dataStockSell, robot_id) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";
  let stock = dataStockSell.stock;
  let lots = dataStockSell.lots;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : stock ",
    stock
  );

  await page.goto(URL_orderpad_sell);

  await page.type("input[id='_stockCode']", stock);
  await page.keyboard.press(String.fromCharCode(13));
  await page.waitFor(3000);

  let bidPrice = await getBidPrice(page);

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : type ",
    bidPrice
  );

  if (bidPrice != "&nbsp;") {
    await page.type("input[id='_volume']", lots);
    await page.type("input[id='_price']", bidPrice);
    await page.click("button[id='_enter']");
    await page.waitFor(1000);
    await page.click("button[id='_confirm']");
    await page.waitFor(1000);
    console.log(
      "Robot " + robot_id + " : =-=-=-=-=SELL BY TIME=-=-=-=-=",
      bidPrice
    );
  }

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : finish"
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : ##############################################"
  );

  return await page.waitFor(1000);
}

// set sell stocks by time off
async function stockSellByTimeOff(page, dataStockSell, robot_id) {
  const URL_orderpad_sell =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?sell";
  let stock = dataStockSell.stock;
  let lots = dataStockSell.lots;

  let priceSell = dataStockSell.priceSell;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : stock ",
    stock
  );

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
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : =-=-=-=-=SELL BY TIME=-=-=-=-=",
    priceSell
  );

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : finish"
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : ##############################################"
  );

  return await page.waitFor(1000);
}

// set buy stock
async function stockBuy(page, dataStockBuy, robot_id) {
  const URL_orderpad_buy =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderpad.jsp?buy";

  let stock = dataStockBuy.stock;
  let priceSell = dataStockBuy.priceSell.replace(",", "");
  let priceBuy = dataStockBuy.priceBuy.replace(",", "");
  let lots = dataStockBuy.lots;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : stock ",
    stock
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : priceBuy ",
    priceBuy
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : priceSell ",
    priceSell
  );

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
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : =-=-=-=-=BUY=-=-=-=-=",
    priceBuy
  );

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") + " Robot " + robot_id + " : finish"
  );
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : ##############################################"
  );

  return await page.waitFor(1000);
}

// get transactions
async function getTransaction(page, robot_id) {
  let URL_orderstatus =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp";

  await page.goto(URL_orderstatus);

  await page.once("load", () =>
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : Page Transaction Loaded!"
    )
  );

  let url = await page.url();

  if (url == URL_orderstatus) {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : Transaction URL",
      url
    );
    try {
      await page.waitFor(5000);
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
              if (
                result["status"] == "Open" ||
                result["status"] == "Withdraw"
              ) {
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
      return [];
    }
  } else {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : Transaction URL",
      url
    );

    eval("gData.errMsg" + robot_id + "= 'Terindikasi double login';");
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
  return fulldata;
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
async function setStockSell(stockData, robot_id) {
  let err, stockSell;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : stockData",
    stockData
  );

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
async function getStockSell(user_id) {
  let err, stockSell;
  let trxNow = moment().format("YYYY-MM-DD");
  let startDate = moment().format("YYYY-MM-DD 00:00:00");
  let EndDate = moment().format("YYYY-MM-DD 23:59:00");

  [err, stockSell] = await to(
    Stock_Sell.findAll({
      where: {
        user_id: user_id,
        mode: "Buy",
        status: "Matched",
        on_sale: "no",
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: EndDate
        }
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
async function getStockSellByTime(user_id) {
  let err, stockSell;
  let trxNow = moment().format("YYYY-MM-DD");
  let startDate = moment().format("YYYY-MM-DD 00:00:00");
  let EndDate = moment().format("YYYY-MM-DD 23:59:00");

  [err, stockSell] = await to(
    Stock_Sell.findAll({
      where: {
        user_id: user_id,
        mode: "Sell",
        status: "open",
        on_sale: "no",
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: EndDate
        }
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

// set stock buy
async function setStockBuy(stockData, robot_id) {
  let err, stockBuy;

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : stockData",
    stockData
  );

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
async function getStockBuy(user_id) {
  let err, stockBuy;

  let trxNow = moment().format("YYYY-MM-DD");
  let startDate = moment().format("YYYY-MM-DD 00:00:00");
  let EndDate = moment().format("YYYY-MM-DD 23:59:00");

  [err, stockBuy] = await to(
    Stock_Sell.findAll({
      where: {
        user_id: user_id,
        mode: "Sell",
        status: "Matched",
        on_sale: "no",
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: EndDate
        }
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
async function setWithdrawStockSell(page, withdrawData, i, robot_id) {
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
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : withdrawStockSell"
    );
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
async function getBuyPrice(level, spreadPerLevel, priceData) {
  let price = priceData;
  let dataPrice = [];
  let spread = 0;

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
  let price = parseInt(dataPrice);

  if (price < 200) {
    spread = 1 * spl;
  }

  if (price >= 200 && price < 500) {
    spread = 2 * spl;
  }

  if (price >= 500 && price < 2000) {
    spread = 5 * spl;
  }

  if (price >= 2000 && price < 5000) {
    spread = 10 * spl;
  }

  if (price >= 5000) {
    spread = 25 * spl;
  }

  return spread;
}

// get lot
async function getLot(stockBudget, level, price, robot_id) {
  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : stockBudget, level, price",
    {
      stockBudget: parseInt(stockBudget),
      level: level,
      price: parseInt(price)
    }
  );

  return Math.round(parseInt(stockBudget) / parseInt(price) / 100).toString();
}

// login
async function login(res, browser, page, username, password, robot_id) {
  try {
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

    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : token ",
      tokenCaptcha
    );

    await page.type("input[id='j_token']", tokenCaptcha);
    await page.click("button[type=submit]");
  } catch (error) {
    let msg = "Gagal bypass captcha";
    await closeErrorRobotBeforeLogin(res, browser, msg, robot_id);
  }
}

// login trading
async function loginTrading(res, browser, page, URL_runningTrade, pin) {
  try {
    await page.goto(URL_runningTrade);
    await page.click("button[onclick='objPopup.showLoginTrading();']");
    await page.type("input[id='_ltPin']", pin);
    await page.click("input[id='_ltEnter']");
  } catch (error) {
    let msg = "Gagal login pin trading";
    await closeErrorRobot(res, browser, msg, robot_id);
  }
}

// get update setting data
async function getUpdateSettingData(pagePF, URL_protofolio, thisUser) {
  await pagePF.goto(URL_protofolio);
  await pagePF.waitFor(1000);

  let user_id = thisUser.user_id;
  let setting = thisUser.setting;

  let cost_total = await pagePF.evaluate(
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

// set off robot status
async function setRobotStatusInitFail(robot_id, message) {
  let robot, data;

  data = {
    off_message: message
  };

  [err, robot] = await to(Robot.findOne({ where: { id: robot_id } }));
  robot.set(data);
  [err, robot] = await to(robot.save());
}

// set withdraw data
async function setWithdrawData(pageWd, URL_accountinfo, robot_id, user_id) {
  let dataGetWistdraw = await getWithdrawRhb(pageWd, URL_accountinfo, robot_id);

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : dataGetWistdraw = ",
    await dataGetWistdraw
  );

  await pageWd.waitFor(3000);

  if (dataGetWistdraw.length > 0) {
    let dataWithdraw = await setObjectDataWithdraw(dataGetWistdraw, user_id);

    await pageWd.waitFor(3000);
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
}

// get withdraw data
async function getWithdrawRhb(page, URL_accountinfo, robot_id) {
  let now = moment()
    .subtract(1, "months")
    .format("MM/01/YYYY");
  await page.goto(URL_accountinfo);
  await page.waitFor(3000);

  await page.type("input[id='date-from']", now);
  // await page.waitFor(1000);
  await page.click("button[onclick='loadWithdrawList();']");
  await page.waitFor(5000);

  try {
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

    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : getWithdrawRhb",
      await data
    );

    return (await data) || [];
  } catch (err) {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : fail get withdraw data"
    );
    return [];
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
async function getPortofolioRhb(pagePF, URL_protofolio, robot_id) {
  await pagePF.goto(URL_protofolio);

  await pagePF.once("load", () =>
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : Page Protofolio Loaded!"
    )
  );

  let url = await pagePF.url();

  if (url == URL_protofolio) {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : Protofolio URL",
      url
    );
    const headData = {};

    let startingBalance = await pagePF.evaluate(
      () => document.querySelector("div[id='_startingBalance']").innerHTML
    );
    await pagePF.waitFor(1000);

    let availableLimit = await pagePF.evaluate(
      () => document.querySelector("div[id='_availableLimit']").innerHTML
    );
    await pagePF.waitFor(1000);

    let fundingAvailable = await pagePF.evaluate(
      () => document.querySelector("div[id='_fundingAvailable']").innerHTML
    );
    await pagePF.waitFor(1000);

    let totalAsset = await pagePF.evaluate(
      () => document.querySelector("div[id='_totalAsset']").innerHTML
    );
    await pagePF.waitFor(1000);

    let cashRdn = await pagePF.evaluate(
      () => document.querySelector("div[id='_cashRdn']").innerHTML
    );
    await pagePF.waitFor(1000);
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

    await pagePF.waitFor(1000);
    const table = await pagePF.evaluate(() => {
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
          if (!text[i]) {
          } else {
            result["stock"] = text[0].textContent;
            (result["avg_buy"] = text[1].textContent.replace(/,\s*/g, "")),
              (result["last"] = text[2].textContent);
            (result["gross_value"] = text[6].textContent.replace(/,\s*/g, "")),
              (result["market_value"] = text[7].textContent.replace(
                /,\s*/g,
                ""
              )),
              (result["pl_price"] = text[10].textContent.replace(/,\s*/g, "")),
              (result["pl_percent"] = text[11].textContent.replace(
                /,\s*/g,
                ""
              )),
              items.push(result);
          }
        }
        resolve(items);
      });
    });

    return { item, table };
  } else {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : Protofolio URL",
      url
    );

    eval("gData.errMsg" + robot_id + "= 'Terindikasi double login';");
  }
}

// set protofolio data
async function setProtofolioData(pagePF, getPortofolio, user_id) {
  let lastinsertId;

  getPortofolio.item.forEach(async el => {
    [err, portofolios] = await to(Portofolios.findOne({ where: { user_id } }));

    el.user_id = user_id;
    if (!portofolios) {
      [err, portofolios] = await to(Portofolios.create(el));
      lastinsertId = portofolios.dataValues.id;
    } else {
      portofolios.set(el);
      [err, portofolios] = await to(portofolios.save());
      lastinsertId = portofolios.dataValues.id;
    }
  });

  await pagePF.waitFor(2000);

  getPortofolio.table.forEach(async el => {
    [err, portofolio_stock] = await to(
      Portofolio_stocks.findOne({ where: { user_id: user_id } })
    );

    el.portofolio_id = lastinsertId;
    el.user_id = user_id;

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

// get data if last more than tp or last less than cl
async function getTpClStock(mapStockOpen, user_id) {
  let dataMapStockOpen = [];

  mapStockOpen.forEach((el, i) => {
    // last >= target profit
    if (el.last >= el.tp) {
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
    } else if (el.last < el.cl) {
      // last < cut lost
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

  let startDate = moment()
    .subtract(1, "days")
    .format("YYYY-MM-DD 00:00:00");

  let EndDate = moment()
    .subtract(1, "days")
    .format("YYYY-MM-DD 23:59:00");

  let err, initBuy;

  [err, initBuy] = await to(
    Init_Buy.findAll({
      where: {
        user_id: user_id,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lt]: EndDate
        }
      }
    })
  );

  return initBuy;
}

// set transaction
async function setTransactionData(pageTrx, user_id, spreadPerLevel, robot_id) {
  let getDataTransaction = await getTransaction(pageTrx, robot_id);

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : getDataTransaction",
    getDataTransaction
  );

  await pageTrx.waitFor(3000);

  let dataStock = {};
  let openStockBuy = [];
  let openStockSell = [];
  let matchStockBuy = [];
  let matchStockSell = [];

  let openStock = [];

  if (getDataTransaction.length > 0) {
    getDataTransaction.forEach(async (el, i) => {
      let spl = parseInt(spreadPerLevel); //DEPRECATED
      let spread = 0;

      let price = el.price.replace(",", "");
      let lots = el.lots.replace(",", "");

      spread = await getSpread(price, spreadPerLevel);

      /** FILTER DATA OPEN */
      if (el.status == "Open") {
        openStock.push({
          order_id: el.order_id,
          user_id: user_id,
          stock: el.stock,
          mode: el.mode,
          lots: lots,
          status: el.status,
          price: price,
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        });
      }

      /** FILTER DATA ORDER BUY */

      // data order buy with status = open
      if (el.status == "Open" && el.mode == "Buy") {
        openStockBuy.push({
          order_id: el.order_id,
          user_id: user_id,
          stock: el.stock,
          mode: el.mode,
          lots: lots,
          status: el.status,
          priceBuy: price,
          priceSell: (parseInt(price) + spread).toString(),
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        });
      }

      // data order buy with status = matched
      if (el.status == "Matched" && el.mode == "Buy") {
        matchStockBuy.push({
          order_id: el.order_id,
          user_id: user_id,
          stock: el.stock,
          mode: el.mode,
          lots: lots,
          status: el.status,
          priceBuy: price,
          priceSell: (parseInt(price) + spread).toString(),
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        });
      }

      /** FILTER DATA ORDER SELL */

      // data order sell with status = open
      if (el.status == "Open" && el.mode == "Sell") {
        openStockSell.push({
          order_id: el.order_id,
          user_id: user_id,
          stock: el.stock,
          mode: el.mode,
          lots: lots,
          status: el.status,
          priceBuy: (parseInt(price) - spread).toString(),
          priceSell: price,
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        });
      }

      // data order sell with status = matched
      if (el.status == "Matched" && el.mode == "Sell") {
        matchStockSell.push({
          order_id: el.order_id,
          user_id: user_id,
          stock: el.stock,
          mode: el.mode,
          lots: lots,
          status: el.status,
          priceBuy: (parseInt(price) - spread).toString(),
          priceSell: price,
          createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        });
      }
    });

    await pageTrx.waitFor(4000);

    dataStock = {
      matchStockSell,
      matchStockBuy,
      openStockSell,
      openStockBuy,
      openStock
    };

    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : Filter Data From Order Status Page",
      dataStock
    );

    return dataStock;
  } else {
    await pageTrx.waitFor(4000);

    dataStock = {
      matchStockSell,
      matchStockBuy,
      openStockSell,
      openStockBuy,
      openStock
    };

    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : Filter Data From Order Status Page",
      dataStock
    );

    return dataStock;
  }
}

// set last init sell by time off
async function setInitBuySell(page, user_id, robot_id) {
  let now = moment().format("YYYY-MM-DD HH:mm:ss");
  let transaction = await getTransaction(page, robot_id);

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : transaction data on setInitBuySell",
    transaction
  );

  await page.waitFor(3000);

  let filterInit = await transaction.filter(el => {
    return el.status == "Open";
  });

  if (filterInit.length > 0) {
    filterInit.forEach(async el => {
      let orderDate = moment().format("YYYY-MM-DD");
      let orderDateTime = orderDate + " " + el.order_time;
      let price = el.price.replace(",", "");
      let lots = el.lots.replace(",", "");

      let data = {
        user_id: user_id,
        order_date: orderDateTime,
        stock: el.stock,
        price: price,
        mode: el.mode,
        updatedAt: now,
        lots: lots
      };
      [err, initBuy] = await to(Init_Buy.create(data));
    });
  }
}

// close error robot
async function closeErrorRobot(res, browser, msg, robot_id) {
  let message = msg;
  let exec = [];

  exec[0] = await setOffRobotStatus(robot_id, message);
  exec[2] = await browser.close();

  Promise.all(exec).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : setOffRobotStatus finish!!!"
    );
  });
}

// close error robot before login
async function closeErrorRobotBeforeLogin(res, browser, msg, robot_id) {
  let message = msg;
  let exec = [];

  exec[0] = await setOffRobotStatus(robot_id, message);
  exec[2] = await browser.close();

  Promise.all(exec).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : setOffRobotStatus finish!!!"
    );
  });

  return res.json(
    {
      success: 0,
      message: "Robot failed to run."
    },
    500
  );
}

/** AUTOMATION SECONDARY JOB */

// automation transaction
async function automationTransaction(pageT, user_id, robot_id) {
  let getDataTransaction = await getTransaction(pageT, robot_id);

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : automationTransaction",
    getDataTransaction
  );

  await pageT.waitFor(3000);

  if (getDataTransaction.length > 0) {
    [err, Datatransaction] = await to(
      Transaction.findAll({ where: { user_id: user_id } })
    );

    if (Datatransaction.length > 0) {
      Datatransaction.forEach(async elements => {
        [err, Datatransaction] = await to(elements.destroy());
      });
    }

    await pageT.waitFor(3000);

    getDataTransaction.forEach(async el => {
      let price = el.price.replace(",", "");
      let lots = el.lots.replace(",", "");

      el.user_id = user_id;
      el.price = price;
      el.lots = lots;

      [err, transaction] = await to(Transaction.create(el));
      console.log(
        moment().format("YYYY-MM-DD HH:mm:ss") +
          " Robot " +
          robot_id +
          " : Transaction Data",
        el
      );
    });
  }
}

// automation protofolio
async function automationPortofolio(pagePF, URL_protofolio, user_id, robot_id) {
  let exec = [];

  exec[0] = await getPortofolioRhb(pagePF, URL_protofolio, robot_id);
  exec[1] = await pagePF.waitFor(1000);
  exec[2] = await console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : portofolio",
    await exec[0]
  );
  exec[3] = await pagePF.waitFor(1000);
  exec[4] = await setProtofolioData(pagePF, exec[0], user_id);

  Promise.all(exec).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : getPortofolioRhb setProtofolioData finish!!!"
    );
  });

  return await exec[0];
}

// input stock rangking
async function inputStockRangking(pageSR) {
  let stock_rangking, getStockrangking, stock, stock_rangkings, err;

  getStockrangking = await stockRanking(pageSR);

  await pageSR.waitFor(1000);

  Promise.all([
    ([err, stock_rangkings] = await to(Stock_rangking.findAll({ raw: true }))),
    stock_rangkings.forEach(async element => {
      ([err, stock_rangkings] = await to(
        Stock_rangking.findOne({ where: { id: element.id } })
      )),
        ([err, stock_rangkings] = await to(stock_rangkings.destroy()));
    }),

    getStockrangking.forEach(async el => {
      [err, stock_rangking] = await to(Stock_rangking.create(el));
    })
  ]);
}

// exec withdraw
async function withdraws(pageWd, URL_accountinfo, robot_id, user_id) {
  let exec = [];

  exec[0] = await setWithdrawData(pageWd, URL_accountinfo, robot_id, user_id);
  exec[1] = await pageWd.waitFor(3000);
  exec[2] = await automationSetWithdrawRhb(
    pageWd,
    URL_accountinfo,
    robot_id,
    user_id
  );

  // run withdraw stock
  Promise.all(exec).then(() => {
    console.log(
      moment().format("YYYY-MM-DD HH:mm:ss") +
        " Robot " +
        robot_id +
        " : withdraw Execute"
    );
  });
}
/** END AUTOMATION SECONDARY JOB */

/** REFRESH PAGE SECONDARY JOB*/

// refresh page automation transaction
async function refreshPageTransaction(pageT, robot_id) {
  let URL_orderstatus =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp";

  await pageT.goto(URL_orderstatus);

  let url = await pageT.url();

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : Transaction URL",
    url
  );
}

// refresh page automation protofolio
async function refreshPagePortofolio(pagePF, URL_protofolio, robot_id) {
  await pagePF.goto(URL_protofolio);

  let url = await pagePF.url();

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : Portfolio URL",
    url
  );
}

// input stock rangking
async function refreshPageStockRangking(pageSR, robot_id) {
  await pageSR.goto(
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/stock_ranking.jsp"
  );

  let url = await pageSR.url();

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : Stock Ranking URL",
    url
  );
}

// refersh page withdraw
async function refreshPageWithdraws(pageWd, URL_accountinfo, robot_id) {
  await pageWd.goto(URL_accountinfo);

  let url = await pageWd.url();

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : Withdraw URL",
    url
  );
}
/** END REFRESH PAGE */

/** REFRESH PAGE MAIN JOB */

// refresh page main job (page for data and exec transaction)
async function refreshPageMainJob(page, pageTrx, URL_runningTrade, robot_id) {
  let URL_orderstatus =
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp";

  await pageTrx.goto(URL_orderstatus);
  await page.goto(URL_runningTrade);

  let urlPage = await page.url();
  let urlpageTrx = await pageTrx.url();

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : Running Trade URL",
    urlPage
  );

  console.log(
    moment().format("YYYY-MM-DD HH:mm:ss") +
      " Robot " +
      robot_id +
      " : Order Status URL",
    urlpageTrx
  );
}
/** END REFRESH PAGE */
