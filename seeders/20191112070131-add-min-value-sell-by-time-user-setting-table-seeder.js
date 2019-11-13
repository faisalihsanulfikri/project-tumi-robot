"use strict";
const moment = require("moment");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "user_settings",
      [
        {
          master_setting_id: 13,
          config_value: "true",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 14,
          config_value: "1000",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        }
      ],
      {}
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("user_settings", null, {});
  }
};
