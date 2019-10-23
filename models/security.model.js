"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define("Security", {
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    pin: DataTypes.STRING,
    active_date: DataTypes.DATE,
    expire_date: DataTypes.DATE
  });

  Model.associate = function(models) {
    // associations can be defined here
  };

  Model.prototype.toWeb = function(pw) {
    let json = this.toJSON();
    return json;
  };

  return Model;
};
