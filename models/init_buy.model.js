"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Init_Buy",
    {
      order_id: DataTypes.STRING,
      user_id: DataTypes.INTEGER,
      order_date: DataTypes.DATE,
      stock: DataTypes.STRING,
      price: DataTypes.INTEGER,
      mode: DataTypes.STRING,
      lots: DataTypes.INTEGER
    },
    {
      reezeTableName: true,
      tableName: "init_buys"
    }
  );

  Model.associate = function(models) {
    Model.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "User"
    });
  };

  return Model;
};
