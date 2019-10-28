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

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const data = await page.goto('https://webtrade.rhbtradesmart.co.id/onlineTrading/html/orderstatus.jsp');
    console.log(data);
  };