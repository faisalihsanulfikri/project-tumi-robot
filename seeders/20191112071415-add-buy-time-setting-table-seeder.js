"use strict";
const moment = require("moment");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "master_settings",
      [
        {
          config_name: "buy_time",
          config_value: "09:00:00",
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
