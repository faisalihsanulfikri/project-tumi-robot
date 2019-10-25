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
          model: "stock",
          key: "id"
        }
      },
      mode: {
        type : DataTypes.ENUM,
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
        type : DataTypes.ENUM,
        values: [
          'day',
          'session'
        ],
        allowNull: true,        
      },
      status: {
        type : DataTypes.ENUM,
        values: [
          'open',
          'matched'
        ],
        defaultValue: 'open'
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