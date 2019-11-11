'use strict';
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    'Stock',
    {
      name: DataTypes.STRING,
      last_price: DataTypes.STRING
    },
    {
      freezeTableName: true,
      tableName: "stocks"
    }
  );

  Model.associate = function(models) {
    // 
  };

  return Model;
};