"use strict";
const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const db = {};
const APP_CONFIG = require("../config/app_config");

const sequelize = new Sequelize(
  APP_CONFIG.db_name,
  APP_CONFIG.db_user,
  APP_CONFIG.db_password,
  {
    host: APP_CONFIG.db_host,
    dialect: APP_CONFIG.db_dialect,
    port: APP_CONFIG.db_port,
    operatorsAliases: false
  }
);

fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach(file => {
    let model = sequelize["import"](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
