"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Robot",
    {
      user_id: DataTypes.INTEGER,
      security_id: DataTypes.INTEGER,
      status: {
        type: DataTypes.ENUM,
        values: ["on", "off"],
        defaultValue: "off"
      },
      off_message: DataTypes.STRING
    },
    {
      freezeTableName: true,
      tableName: "robots"
    }
  );
  Model.associate = function(models) {
    Model.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "User"
    });
    Model.belongsTo(models.Security, {
      foreignKey: "security_id",
      as: "Security"
    });
  };

  Model.prototype.toWeb = function(pw) {
    let json = this.toJSON();
    return json;
  };

  return Model;
};
