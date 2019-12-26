"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Check_Init_Buy",
    {
      user_id: DataTypes.INTEGER,
      order_date: DataTypes.DATE,
      stock: DataTypes.STRING,
      mode: DataTypes.STRING,
      price: DataTypes.INTEGER,
      lots: DataTypes.INTEGER,
      on_submit: {
        type: DataTypes.ENUM,
        values: ["yes", "no"],
        defaultValue: "no"
      }
    },
    {
      freezeTableName: true,
      tableName: "check_init_buys"
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
