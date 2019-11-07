"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("stock_sells", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      order_id: {
        type: Sequelize.STRING
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id"
        }
      },
      stock: {
        type: Sequelize.STRING
      },
      mode: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
      },
      priceBuy: {
        type: Sequelize.STRING
      },
      priceSell: {
        type: Sequelize.STRING
      },
      on_sale: {
        type: Sequelize.ENUM,
        values: ["yes", "no"],
        defaultValue: "no"
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("stock_sells");
  }
};
