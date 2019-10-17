"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "master_setting",
    {
      config_name: DataTypes.STRING,
      config_value: DataTypes.STRING
    },
    {}
  );
  Model.associate = function(models) {
    // associations can be defined here
  };

  Model.prototype.toWeb = function(pw) {
    let json = this.toJSON();
    return json;
  };

  return Model;
};
