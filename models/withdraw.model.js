"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Withdraw",
    {
      user_id: DataTypes.INTEGER,
      amount: DataTypes.STRING,
      on_submit: {
        type: DataTypes.ENUM,
        values: ["no", "yes"],
        defaultValue: "no"
      }
    },
    {
      freezeTableName: true,
      tableName: "withdraws"
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
