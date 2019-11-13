'use strict';
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define('Transaction', {
    stock: DataTypes.STRING,
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
    user_id: DataTypes.INTEGER,
  },
  {
    freezeTableName: true,
    tableName: "transactions"
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Model;
};