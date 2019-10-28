const { promisify } = require("util")
const express = require("express")
const GoogleSpreadsheet = require("google-spreadsheet")

const router = express.Router()
const cred = require("../client_secret.json")

router.get("/", async (req, res) => {
  const id = "13ESpdzifw98ptByFFJqNKN316tnEiMCYcTsquSTsYtM"
  const doc = new GoogleSpreadsheet(id)

  await promisify(doc.useServiceAccountAuth)(cred)

  const info = await promisify(doc.getInfo)()
  const sheet = info.worksheets[1]
  const rows = await promisify(sheet.getRows)({ offset: 1 })

  let stocks = []

  rows.forEach(el => {
    stocks.push({
      no: el.no,
      stock: el.stock,
      close: el.close,
      volume: el.volume,
      value: el.value
    })
  })

  return res.json({
    method: req.method,
    length: stocks.filter(el => el.stock !== "").length,
    data: stocks.filter(el => el.stock !== "")
  })
})

module.exports = router
