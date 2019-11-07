"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Stock_Sell",
    {
      order_id: DataTypes.STRING,
      user_id: DataTypes.INTEGER,
      stock: DataTypes.STRING,
      mode: DataTypes.STRING,
      status: DataTypes.STRING,
      on_sale: {
        type: DataTypes.ENUM,
        values: ["yes", "no"],
        defaultValue: "yes"
      }
    },
    {
      freezeTableName: true,
      tableName: "stock_sells"
    }
  );
  Model.associate = function(models) {
    Model.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "users"
    });
  };
  return Model;
};
