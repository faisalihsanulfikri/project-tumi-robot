'use strict';
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define('Security', {
    userId: DataTypes.INTEGER,
    securityName: DataTypes.STRING,
    securityUserId: DataTypes.STRING,
    securityPassword: DataTypes.STRING,
    securityPin: DataTypes.STRING
  });

  Model.associate = function(models) {
    // associations can be defined here
  };

  Model.prototype.toWeb = function (pw) {
    let json = this.toJSON();
    return json;
  };

  return Model;
};