const { Security } = require("../models");
const { Robot } = require("../models");
const { to, ReE, ReS } = require("../services/util.service");

module.exports.run = async function(req, res) {
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
};
