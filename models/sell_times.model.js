"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Sell_Times",
    {
      user_id: DataTypes.INTEGER,
      on_sell_by_time: {
        type: DataTypes.ENUM,
        values: ["yes", "no"],
        defaultValue: "no"
      }
    },
    {}
  );

  Model.associate = function(models) {
    Model.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "User"
    });
  };

  return Model;
};
