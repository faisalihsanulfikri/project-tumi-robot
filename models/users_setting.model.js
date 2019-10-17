"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "users_setting",
    {
      master_setting_id: DataTypes.INTEGER,
      config_value: DataTypes.ENUM({
        values: ["value", "another value"],
        defaultValue: "value"
      })
    },
    {}
  );
  Model.associate = function(models) {
    Model.belongsTo(models.master_setting, {
      foreignKey: "master_setting_id",
      as: "master_setting"
    });
  };
  return Model;
};
