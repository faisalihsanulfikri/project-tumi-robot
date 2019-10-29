const { to, ReE, ReS } = require('../services/util.service');
const { Transaction } = require("../models");
const { Stock } = require("../models");

module.exports.get_transaction = async function(req, res) {
    let transaction;
    let stock;
    let transactions
  
    [err, transaction] = await to(Transaction.findAll({ raw: true }));
  
    transaction.forEach(el => {
      transactions = el;
    });
    [err, stock] = await to(Stock.findOne({where: { id: transactions.stock_id }}));
  
  
    return ReS(res, { transaction: transactions, Stock: stock });
  };

module.exports.buyAndSell = async function(req, res) {

  const puppeteer = require("puppeteer");
  const Tesseract = require("../node_modules/tesseract.js");
  const fs = require("fs");
  const username = "Rvr2492";
  const password = "147903";

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  const URL = "https://webtrade.rhbtradesmart.co.id/onlineTrading/login.jsp";
  const page = await browser.newPage();

  await page.goto(URL);
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
      // logger: m => console.log(m)
    }
  ).then(({ data: { text } }) => {
    token = text.replace(/\D+/g, "").trim();
    token.toString().substring(0, 4);
    return token;
  });

  console.log("token ", tokenCaptcha);

  await page.type("input[id='j_token']", tokenCaptcha);

  await page.click("button[type=submit]");

    await page.goto('https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp');
    await page.click("button[onclick='objPopup.showLoginTrading();']");
    await page.type("input[id='_ltPin']", password);
    await page.click("input[id=_ltEnter]");
    await page.click("button[id='_orderEnter']");

    await page.waitFor(1000);

    const data = await page.evaluate(() => {
      let results = [];
      let items = document.querySelectorAll('td[class=T1_col_1]');
      console.log('items', items);
      items.forEach((item) => {
          results.push({
              text: item.innerText,
          });
      });
      return results;
    })
    // console.log(data);
    return ReS(res, {data: data});
  };