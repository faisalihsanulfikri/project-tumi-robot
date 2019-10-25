'use strict';
module.exports = (sequelize, DataTypes) => {
  var transaction = sequelize.define('Transaction', {
    stock_id: DataTypes.INTEGER,
    mode: {
      type : DataTypes.ENUM,
      values: [
        'buy',
        'sell',
      ],
      allowNull: true,
    },
    order_id: DataTypes.STRING,
    order_date: DataTypes.DATE,
    order_time: DataTypes.TIME,
    order_amount: DataTypes.INTEGER,
    price: DataTypes.INTEGER,
    lots: DataTypes.INTEGER,
    validity: {
     type : DataTypes.ENUM,
     values: [
       'day',
       'session'
     ],
     allowNull: true,
      },
    status:{
      type : DataTypes.ENUM,
      values: [
        'open',
        'matched'
      ],
       defaultValue: 'open'
       },
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return transaction;
};