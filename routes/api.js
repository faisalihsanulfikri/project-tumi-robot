const express = require("express");
const router = express.Router();

const UserController = require("../controllers/user.controller");
const RobotController = require("../controllers/robot.controller");

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

router.post("/auth/login", UserController.login);

router.post(
  "/robot/run/:robot_id",
  passport.authenticate("jwt", { session: false }),
  RobotController.run
);

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
