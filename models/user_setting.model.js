"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "User_Setting",
    {
      master_setting_id: DataTypes.INTEGER,
      config_value: DataTypes.STRING,
      user_id: DataTypes.INTEGER
    },
    {}
  );
  Model.associate = function(models) {
    Model.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "users"
    });
    Model.belongsTo(models.Master_Setting, {
      foreignKey: "master_setting_id",
      as: "master_settings"
    });
  };
  return Model;
};
