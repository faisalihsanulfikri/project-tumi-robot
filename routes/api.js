const express = require("express");
const router = express.Router();

const SecurityController = require("../controllers/security.controller");
const SettingController = require("../controllers/setting.controller");
const UserController = require("../controllers/user.controller");
const TransactionController = require("../controllers/transaction.controller");
const RobotController = require("../controllers/robot.controller");
const PortofolioController = require("../controllers/portofolio.controller");
const SpreadsheetController = require("../controllers/spreadsheet.controller");

const custom = require("./../middleware/custom");

const passport = require("passport");
const path = require("path");

require("./../middleware/passport")(passport);
/* GET home page. */
router.get("/", function(req, res, next) {
  res.json({
    status: "success",
    message: "Parcel Pending API (TEST)",
    data: { version_number: "v1.0.0" }
  });
});

router.post("/run/:robot_id", RobotController.run);

// router.post(
//   "/run/:robot_id",
//   passport.authenticate("jwt", { session: false }),
//   RobotController.run
// );

//********* API DOCUMENTATION **********
router.use(
  "/docs/api.json",
  express.static(path.join(__dirname, "/../public/v1/documentation/api.json"))
);
router.use(
  "/docs",
  express.static(path.join(__dirname, "/../public/v1/documentation/dist"))
);
module.exports = router;
