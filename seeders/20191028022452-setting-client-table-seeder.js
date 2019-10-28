"use strict";
const moment = require("moment");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "user_settings",
      [
        {
          master_setting_id: 1,
          config_value: "",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 2,
          config_value: "20",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 3,
          config_value: "5",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 4,
          config_value: "",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 5,
          config_value: "",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 6,
          config_value: "2",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 7,
          config_value: "1",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 8,
          config_value: "default",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 9,
          config_value: "",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 10,
          config_value: "8",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 11,
          config_value: "15:00:00",
          user_id: 2,
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          master_setting_id: 12,
          config_value: "open",
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
