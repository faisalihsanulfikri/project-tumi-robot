"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "User_Withdraw",
    {
      user_id: DataTypes.INTEGER,
      request_time: DataTypes.DATE,
      reference_no: DataTypes.STRING,
      amount: DataTypes.STRING,
      processed_at: DataTypes.DATE,
      status: DataTypes.STRING,
      reason: DataTypes.STRING
    },
    {
      freezeTableName: true,
      tableName: "user_withdraws"
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
