"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Robot",
    {
      user_id: DataTypes.INTEGER,
      security_id: DataTypes.INTEGER,
      status: DataTypes.STRING,
      off_message: DataTypes.STRING
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
