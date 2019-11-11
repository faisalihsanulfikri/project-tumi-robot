const { to, ReE, ReS } = require("../services/util.service")
const { Portofolio } = require("../models")
const { Stock } = require("../models")
const { User } = require("../models");
const { Security } = require("../models");
const { Robot } = require("../models");
const { Master_Setting } = require("../models");
const { User_Setting } = require("../models");


// get protofolio

module.exports.portofolio = async function(req,res){
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
    "https://webtrade.rhbtradesmart.co.id/onlineTrading/html/portfolio.jsp"
  )
  await page.click("button[onclick='objPopup.showLoginTrading();']")
  await page.type("input[id='_ltPin']", password)
  await page.click("input[id=_ltEnter]")
  await page.click("button[id='_refresh']")

  await page.waitFor(1000);
  
  const headData = {}
  
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

        headData['starting_balance'] = await startingBalance.replace(/,\s*/g, ""), 
        headData['available_limit'] = await availableLimit.replace(/,\s*/g, ""), 
        headData['funding_available'] = await fundingAvailable.replace(/,\s*/g, ""), 
        headData['total_asset'] = await totalAsset.replace(/,\s*/g, ""), 
        headData['cash_in_rdn'] = await cashRdn.replace(/,\s*/g, ""), 
        
    item.push(headData);

  await page.waitFor(1000);
  const table = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      let table = document.querySelector("#_portfolio")
      let row = table.children
      let items = []
      let lenght = []
      lenght = row.length - 1;

      for (let i = 0; i < lenght; i++) {
        let result = {}
        const tr = row[i];
        const text = tr.children
        if(!text[i].textContent){

        }else{
          result["stock"] = text[0].textContent
          result["avg_buy"] = text[1].textContent.replace(/,\s*/g, ""),
          result["last"] = text[2].textContent
          result["gross_value"] = text[6].textContent.replace(/,\s*/g, ""),
          result["market_value"] = text[7].textContent.replace(/,\s*/g, ""),
          result["pl_price"] = text[10].textContent.replace(/,\s*/g, ""),
          result["pl_percent"] = text[11].textContent.replace(/,\s*/g, ""),


        items.push(result)
        }

      }
      resolve(items)
    })
  })
  const data = item.concat(table)

    return data
};

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

module.exports.inputPortofolio = async function(req, res){
    const puppeteer = require("puppeteer");
    const { Portofolio } = require("../models")

    let portofolio,getPortofolio,stock,err;

    getPortofolio = await module.exports.portofolio();

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null
      });
  
      const page = await browser.newPage();
      await page.waitFor(1000);

      let users = await getUsers();

      let thisUser = users[0];

      let user_id = thisUser.user_id;

    getPortofolio.forEach(async el => {
      [err, portofolio] = await to(Portofolio.findOne({ where: { user_id: user_id } }));
      [err, stock] = await to(Stock.findOne({ where: { name: el.stock } }));
      // console.log(stock.dataValues.id)
      if(el.stock){
        el.stock_id = stock.dataValues.id;
      }
        el.user_id = user_id;
      if(!portofolio){
          [err, portofolio] = await to(Portofolio.create(el));
      }else {
        portofolio.set(el);
          [err, portofolio] = await to(portofolio.save());
      }
        
    });

    return ReS(res, { message: "Berhasil Input Portofilio" },201  );

}

module.exports.getPortofolio = async function(req, res){
    let portofolio
    let stock
    let user_id = 2;
    [err, portofolio] = await to(Portofolio.findAll({ where: { user_id } }));
    // console.log(portofolio.length)
    let data = [];
    for (let i = 0; i < portofolio.length; i++) {
      const el = portofolio[i];
     [err, stock] = await to(Stock.findAll({ where: { id: el.stock_id } }))
     
     data.push({...stock})
     console.log(stock)
     
    }
    return ReS(res, { portfolio: portofolio.map(el=>el), Stocks: data })
}
  