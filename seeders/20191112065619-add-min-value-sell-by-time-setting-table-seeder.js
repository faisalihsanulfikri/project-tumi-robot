"use strict";
const moment = require("moment");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "master_settings",
      [
        {
          config_name: "is_sell_by_time",
          config_value: "true",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "min_value",
          config_value: "1000",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        }
      ],
      {}
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("master_settings", null, {});
  }
};
