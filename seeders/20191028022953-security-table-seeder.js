"use strict";
const moment = require("moment");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "securities",
      [
        {
          username: "Rvr2492",
          password: "147903",
          pin: "147903",
          active_date: moment().format("YYYY-MM-DD H:mm:ss"),
          expire_date: moment().format("YYYY-MM-DD H:mm:ss"),
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        }
      ],
      {}
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("securities", null, {});
  }
};
