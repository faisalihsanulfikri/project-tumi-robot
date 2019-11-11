'use strict';
module.exports = (sequelize, DataTypes) => {
  var model = sequelize.define('Stock', {
    name: DataTypes.STRING,
    last_price: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return model;
};