const { to, ReE, ReS } = require("../services/util.service")
const { Transaction } = require("../models")
const { Stock } = require("../models")

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
  const username = "Rvr2492"
  const password = "147903"

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
            result["user_id"] = '3'
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
    await page.waitFor(5000);


    buyandsell.forEach(async el => {
        [err, transaction] = await to(Transaction.findOne({ where: { order_id: el.order_id } }));
        if (!transaction) {
          console.log(el);
          [err, transaction] = await to(Transaction.create(el));
        }else{
          transaction.set(el);
          [err, transaction] = await to(transaction.save());
        }
      });

      return ReS(res, { message: "Berhasil Input Transaksi" },201  );
};
