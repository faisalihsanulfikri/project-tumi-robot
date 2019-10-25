"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Robot",
    {
      user_id: DataTypes.INTEGER,
      security_id: DataTypes.INTEGER,
      status: DataTypes.STRING,
      off_message: {
        type: DataTypes.ENUM,
        values: ["on", "off"],
        defaultValue: "off"
      }
    },
    {}
  );
  Model.associate = function(models) {
    Model.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "users"
    });
    Model.belongsTo(models.Security, {
      foreignKey: "security_id",
      as: "securities"
    });
  };

  Model.prototype.toWeb = function(pw) {
    let json = this.toJSON();
    return json;
  };

  return Model;
};
