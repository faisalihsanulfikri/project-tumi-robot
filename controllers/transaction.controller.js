const { to, ReE, ReS } = require("../services/util.service")
const { Transaction } = require("../models")
const { Stock } = require("../models")
const { User } = require("../models");
const { Security } = require("../models");
const { Robot } = require("../models");
const { Master_Setting } = require("../models");
const { User_Setting } = require("../models");

module.exports.get_transaction = async function(req, res) {
  let transaction
  let stock
  let user_id = req.params.user_id;
  [err, transaction] = await to(Transaction.findAll({ where: { user_id } }));
  
  let data = [];
  for (let i = 0; i < transaction.length; i++) {
    const el = transaction[i];
   [err, stock] = await to(Stock.findAll({ where: { id: el.stock_id } }))
    console.log(stock.data)

    data[i] = stock;

  }
  return ReS(res, { transactions: transaction.map(el=>el), Stocks: data })

}

module.exports.buyAndSell = async function(req, res) {
  const puppeteer = require("puppeteer")
  const Tesseract = require("../node_modules/tesseract.js")
  const fs = require("fs")
  const username = "HE00201"
  const password = "245625"

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    // executablePath:
    //   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  })

  const URL = "https://webtrade.rhbtradesmart.co.id/onlineTrading/login.jsp"
  const page = await browser.newPage()

  await page.goto(URL)
  await page.type("input[id='j_username']", username)
  await page.type("input[id='password']", password)

  await page.waitForSelector("img[alt='athentication token']")
  await page.evaluate(() => {
    document.querySelector(".form-login").style.backgroundColor = "white"
    document.querySelector("img[alt='athentication token']").style.transform =
      "scale(2.2) skew(-60deg, 5deg)"
    document.querySelector("img[alt='athentication token']").style.filter =
      "grayscale(1) brightness(3) contrast(10)"
  })

  let captcha = await page.$("img[alt='athentication token']")
  await captcha.screenshot({
    path: "./public/images/captcha/captcha.png",
    omitBackground: true
  })

  let tokenCaptcha = await Tesseract.recognize(
    "./public/images/captcha/captcha.png",
    "eng",
    {
      logger: m => console.log(m)
    }
  ).then(({ data: { text } }) => {
    token = text.replace(/\D+/g, "").trim()
    token.toString().substring(0, 4)
    return token
  })

  await page.type("input[id='j_token']", tokenCaptcha)
  await page.click("button[type=submit]")

  await page.goto(
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp"
  )
  await page.click("button[onclick='objPopup.showLoginTrading();']")
  await page.type("input[id='_ltPin']", password)
  await page.click("input[id=_ltEnter]")
  await page.click("button[id='_orderEnter']")

  await page.waitFor(1000)

  try {
    const data = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        let table = document.querySelector("#_orderTable")
        let row = table.children
        let items = []

        for (let index = 0; index < row.length; index++) {
          let result = {}

          for (let i = 0; i < row[index].cells.length; i++) {
            result["order_time"] = row[index].cells[1].textContent
            result["order_id"] = row[index].cells[2].textContent
            result["market"] = row[index].cells[3].textContent
            result["mode"] = row[index].cells[4].textContent
            result["stock"] = row[index].cells[5].textContent
            result["price"] = row[index].cells[6].textContent
            result["remain"] = row[index].cells[7].textContent
            result["match"] = row[index].cells[8].textContent
            result["status"] = row[index].cells[9].textContent
            if (result["status"] == 'Open') {
              result["lots"] = result["remain"]              
            } else if (result["status"] == 'Matched') {
              result["lots"] = result["match"]            
            }
            result["order_amount"] = row[index].cells[10].textContent
            result["match_amount"] = row[index].cells[11].textContent
            result["validity"] = row[index].cells[12].textContent
            result["channel"] = row[index].cells[13].textContent
          }

          items.push(result)
        }

        resolve(items)
      })
    })
    // console.log(data)
    return data
  } catch (err) {
    return (err)
  }
}

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

module.exports.inputTransaction  = async function(req, res){
  const puppeteer = require("puppeteer");
  const { Transaction } = require("../models")

    
    let Datatransaction,transaction,err;

    let buyandsell = await module.exports.buyAndSell()
    
    // console.log(buyandsell);

    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null
    });

    const page = await browser.newPage();
    await page.waitFor(1000);
    let users = await getUsers();

    let thisUser = users[0];
  
    let user_id = thisUser.user_id;

    let stock_id = 1;

    buyandsell.forEach(async el => {
      el.user_id = user_id;
      el.stock_id = stock_id;
        [err, transaction] = await to(Transaction.findOne({ where: { order_id: el.order_id } }));
        if (!transaction) {
          console.log(el);
          [err, transaction] = await to(Transaction.create(el));
          if (err) return ReE(res, err, 422);
        }else{
          transaction.set(el);
          [err, transaction] = await to(transaction.save());
          if (err) return ReE(res, err, 422);
        }
      });

    await page.waitFor(2000);


      return ReS(res, { message: "Berhasil Input Transaksi" },201  );
};
