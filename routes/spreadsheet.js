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

  const pukatSheet = info.worksheets[1]
  const ch10Sheet = info.worksheets[2]
  const ch2Sheet = info.worksheets[3]
  const aroSheet = info.worksheets[5]

  const pukatRows = await promisify(pukatSheet.getRows)({ offset: 1 })
  const ch10Rows = await promisify(ch10Sheet.getRows)({ offset: 1 })
  const ch2Rows = await promisify(ch2Sheet.getRows)({ offset: 1 })
  const aroRows = await promisify(aroSheet.getRows)({ offset: 1 })

  let stocks = []

  pukatRows.forEach(el => {
    stocks.push({
      no: el.no,
      stock: el.stock,
      close: el.close,
      volume: el.volume,
      value: el.value
    })
  })

  ch10Rows.forEach(el => {
    stocks.push({
      no: el.no,
      stock: el.stock,
      close: el.hargaclose,
      volume: el.volume,
      value: el.value
    })
  })

  ch2Rows.forEach(el => {
    stocks.push({
      no: el.no,
      stock: el.stock,
      close: el.close,
      volume: el.volume,
      value: el.value
    })
  })

  aroRows.forEach(el => {
    stocks.push({
      no: el.no,
      stock: el.stock,
      close: el.hargaclose,
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
