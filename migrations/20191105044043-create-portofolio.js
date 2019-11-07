'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('portofolios', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      starting_balance: {
        type: Sequelize.STRING
      },
      available_limit: {
        type: Sequelize.STRING
      },
      funding_available: {
        type: Sequelize.STRING
      },
      total_asset: {
        type: Sequelize.STRING
      },
      cash_in_rdn: {
        type: Sequelize.STRING
      },
      profit_lost: {
        type: Sequelize.STRING
      },
      roi: {
        type: Sequelize.STRING
      },
      stock_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "stocks",
          key: "id"
        }
      },
      avg_buy: {
        type: Sequelize.STRING
      },
      last: {
        type: Sequelize.STRING
      },
      lot: {
        type: Sequelize.STRING
      },
      gross_value: {
        type: Sequelize.STRING
      },
      market_value: {
        type: Sequelize.STRING
      },
      pl_price: {
        type: Sequelize.STRING
      },
      pl_percent: {
        type: Sequelize.STRING
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "users",
          key: "id"
        }
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
    return queryInterface.dropTable('portofolios');
  }
};