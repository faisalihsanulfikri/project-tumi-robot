"use strict";
const moment = require("moment");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "users",
      [
        {
          username: "client",
          email: "client@gmail.com",
          phone: "082222333444",
          password:
            "$2b$10$AE3Tti6H8JZYZmFyzGjhdesAHPCRs0ovLG9oCaDqr1pCIB9lcYzji",
          register_date: moment().format("YYYY-MM-DD H:mm:ss"),
          level: "1",
          status: "active",
          createdAt: moment().format("YYYY-MM-DD H:mm:ss"),
          updatedAt: moment().format("YYYY-MM-DD H:mm:ss")
        }
      ],
      {}
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("users", null, {});
  }
};
