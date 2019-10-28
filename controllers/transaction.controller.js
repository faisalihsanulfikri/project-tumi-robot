const { to, ReE, ReS } = require('../services/util.service');
const puppeteer = require('puppeteer');

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

    const browser = await puppeteer.launch({
      headless: false
    });
    const page = await browser.newPage();
    await page.goto('https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp');
    const data = await page.evaluate(() => {
      let results = [];
      let items = document.querySelectorAll('td.T1_col_1');
      items.forEach((item) => {
          results.push({
              text: item.innerText,
          });
      });
      return results;
    })
    browser.close();
    console.log(data);
    return ReS(res, {data: data});
  };