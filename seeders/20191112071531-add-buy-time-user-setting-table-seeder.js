"use strict";
const moment = require("moment");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "user_settings",
      [
        {
          master_setting_id: 15,
          config_value: "09:00:00",
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
