"use strict";
const bcrypt = require("bcrypt");
const bcrypt_p = require("bcrypt-promise");
const jwt = require("jsonwebtoken");
const { TE, to } = require("../services/util.service");
const APP_CONFIG = require("../config/app_config");

module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "User",
    {
      username: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: { isEmail: { msg: "Email invalid." } }
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          len: { args: [7, 20], msg: "Phone number invalid, too short." },
          isNumeric: { msg: "not a valid phone number." }
        }
      },
      password: DataTypes.STRING,
      register_date: DataTypes.DATE,
      level: DataTypes.STRING,
      status: {
        type: DataTypes.ENUM,
        values: ["pending", "active", "suspend"],
        defaultValue: "pending"
      },
      reset_token: DataTypes.STRING
    },
    {
      freezeTableName: true,
      tableName: "users"
    }
  );

  Model.associate = function(models) {
    // associations can be defined here
  };

  Model.beforeSave(async (user, options) => {
    let err;
    if (user.changed("password")) {
      let salt, hash;
      [err, salt] = await to(bcrypt.genSalt(10));
      if (err) TE(err.message, true);

      [err, hash] = await to(bcrypt.hash(user.password, salt));
      if (err) TE(err.message, true);

      user.password = hash;
    }
  });

  Model.prototype.comparePassword = async function(pw) {
    let err, pass;
    if (!this.password) TE("password not set");

    [err, pass] = await to(bcrypt_p.compare(pw, this.password));
    if (err) TE(err);

    if (!pass) TE("invalid password");

    return this;
  };

  Model.prototype.getJWT = function() {
    let expiration_time = parseInt(APP_CONFIG.jwt_expiration);
    return (
      "Bearer " +
      jwt.sign(
        { user_id: this.id, user_level: this.level },
        APP_CONFIG.jwt_encryption,
        { expiresIn: expiration_time }
      )
    );
  };

  Model.prototype.toWeb = function(pw) {
    let json = this.toJSON();
    return json;
  };

  return Model;
};
