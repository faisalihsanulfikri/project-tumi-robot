const { promisify } = require("util")
const express = require("express")
const GoogleSpreadsheet = require("google-spreadsheet")

const router = express.Router()
const cred = require("../client_secret.json")

const sheets = [
  { index: 1, name: "defaultpukat" },
  { index: 2, name: "ch10" },
  { index: 3, name: "ch2" },
  { index: 5, name: "aro" }
]

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

router.get("/:sheet", async (req, res) => {
  const id = "13ESpdzifw98ptByFFJqNKN316tnEiMCYcTsquSTsYtM"
  const doc = new GoogleSpreadsheet(id)
  const sheetName = req.params.sheet

  // Check sheet name and get the index
  let sheet = sheets.filter(el => el.name === sheetName)
  if (sheet.length === 0) {
    return res.status(422).json({ msg: "Invalid sheet name" })
  }

  await promisify(doc.useServiceAccountAuth)(cred)

  const info = await promisify(doc.getInfo)()
  const worksheet = info.worksheets[sheet[0].index]
  const rows = await promisify(worksheet.getRows)({ offset: 1 })

  let stocks = []

  rows.forEach(el => {
    stocks.push({
      no: el.no,
      stock: el.stock,
      close: el.close || el.hargaclose,
      volume: el.volume,
      value: el.value
    })
  })

  let result = stocks.filter(el => el.stock !== "")

  res.json({
    message: "Successfull getting stocks data",
    length: result.length,
    data: result
  })
})

module.exports = router
