'use strict';
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define('Stock_rangking', {
    stock: DataTypes.STRING,
    prev: DataTypes.STRING,
    open: DataTypes.STRING,
    high: DataTypes.STRING,
    low: DataTypes.STRING,
    last: DataTypes.STRING,
    chg: DataTypes.STRING,
    chg_percent: DataTypes.STRING,
    freq: DataTypes.STRING,
    vol: DataTypes.STRING,
    val: DataTypes.STRING,

  },
  {
    freezeTableName: true,
    tableName: "stock_rankings"
  }, {
  });
  return Model;
};