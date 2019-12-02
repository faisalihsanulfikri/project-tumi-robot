"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Portofolio_stocks",
    {
      stock: DataTypes.STRING,
      avg_buy: DataTypes.STRING,
      last: DataTypes.STRING,
      gross_value: DataTypes.STRING,
      market_value: DataTypes.STRING,
      pl_price: DataTypes.STRING,
      pl_percent: DataTypes.STRING,
      portofolio_id: DataTypes.INTEGER,
      user_id: DataTypes.INTEGER
    },
    {
      freezeTableName: true,
      tableName: "portofolio_stocks"
    },
    {
      classMethods: {
        associate: function(models) {
          // associations can be defined here
        }
      }
    }
  );
  return Model;
};
