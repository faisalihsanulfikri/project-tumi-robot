"use strict";
const moment = require("moment");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "master_settings",
      [
        {
          config_name: "cost_total",
          config_value: "",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "fund_used",
          config_value: "20",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "max_stock",
          config_value: "5",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "dana_per_stock",
          config_value: "",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "level_per_stock",
          config_value: "",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "spread_per_level",
          config_value: "2",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "profit_per_level",
          config_value: "1",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "stock_mode",
          config_value: "default",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "stock_value",
          config_value: "",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "cl_value",
          config_value: "8",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        },
        {
          config_name: "cl_time",
          config_value: "15:00:00",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        }
      ],
      {}
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("Master_Setting", null, {});
  }
};
