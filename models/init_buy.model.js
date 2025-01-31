"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Init_Buy",
    {
      user_id: DataTypes.INTEGER,
      order_date: DataTypes.DATE,
      stock: DataTypes.STRING,
      price: DataTypes.INTEGER,
      mode: DataTypes.STRING,
      lots: DataTypes.INTEGER,
      order_id: DataTypes.STRING,
      on_submit: {
        type: DataTypes.ENUM,
        values: ["yes", "no"],
        defaultValue: "no"
      }
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
