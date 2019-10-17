const express = require("express");
const router = express.Router();

const SecurityController = require("../controllers/security.controller");
const SettingController = require("../controllers/setting.controller");
const UserController = require("../controllers/user.controller");

const custom = require("./../middleware/custom");

const passport = require("passport");
const path = require("path");

require("./../middleware/passport")(passport);
/* GET home page. */
router.get("/", function(req, res, next) {
  res.json({
    status: "success",
    message: "Parcel Pending API",
    data: { version_number: "v1.0.0" }
  });
});

/**
 * authorization
 */
router.post("/auth/register", UserController.register);
router.post("/auth/login", UserController.login);

/**
 * user
 */
router.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  UserController.getAll
);
router.get(
  "/users/:user_id",
  passport.authenticate("jwt", { session: false }),
  UserController.get
);
router.put(
  "/users/:user_id",
  passport.authenticate("jwt", { session: false }),
  UserController.update
);
router.delete(
  "/users/:user_id",
  passport.authenticate("jwt", { session: false }),
  UserController.remove
);

/**
 * Security (Sekuritas)
 */
router.post(
  "/securities",
  passport.authenticate("jwt", { session: false }),
  SecurityController.create
);
router.get(
  "/securities",
  passport.authenticate("jwt", { session: false }),
  SecurityController.getAll
);
router.get(
  "/securities/:security_id",
  passport.authenticate("jwt", { session: false }),
  SecurityController.get
);
router.get(
  "/securities/user/:user_id",
  passport.authenticate("jwt", { session: false }),
  SecurityController.getByUserId
);
router.put(
  "/securities/:security_id",
  passport.authenticate("jwt", { session: false }),
  SecurityController.update
);
router.delete(
  "/securities/:security_id",
  passport.authenticate("jwt", { session: false }),
  SecurityController.remove
);

/**
 * Setting
 */
router.post(
  "/settings",
  passport.authenticate("jwt", { session: false }),
  SettingController.create
);
router.get(
  "/settings",
  passport.authenticate("jwt", { session: false }),
  SettingController.getAll
);
router.get(
  "/settings/:setting_id",
  // passport.authenticate("jwt", { session: false }),
  SettingController.get
);
router.get(
  "/settings/user/:user_id",
  passport.authenticate("jwt", { session: false }),
  SettingController.getByUserId
);
router.put(
  "/settings/:setting_id",
  passport.authenticate("jwt", { session: false }),
  SettingController.update
);
router.delete(
  "/settings/:setting_id",
  passport.authenticate("jwt", { session: false }),
  SettingController.remove
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
