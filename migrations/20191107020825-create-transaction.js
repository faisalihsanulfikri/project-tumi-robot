'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stock_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "stocks",
          key: "id"
        }
      },
      mode: {
        type : Sequelize.ENUM,
        values: [
          'buy',
          'sell',
        ],
        allowNull: true,        
      },
      order_id: {
        type: Sequelize.STRING
      },
      order_date: {
        type: Sequelize.DATE
      },
      order_time: {
        type: Sequelize.TIME
      },
      order_amount: {
        type: Sequelize.INTEGER
      },
      price: {
        type: Sequelize.INTEGER
      },
      lots: {
        type: Sequelize.INTEGER
      },
      validity: {
        type : Sequelize.ENUM,
        values: [
          'day',
          'session'
        ],
        allowNull: true,        
      },
      status: {
        type : Sequelize.ENUM,
        values: [
          'open',
          'matched'
        ],
        defaultValue: 'open'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
    return queryInterface.dropTable('transactions');
  }
};