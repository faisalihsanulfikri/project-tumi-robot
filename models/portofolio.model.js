"use strict";
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define(
    "Portofolios",
    {
      starting_balance: DataTypes.STRING,
      available_limit: DataTypes.STRING,
      funding_available: DataTypes.STRING,
      total_asset: DataTypes.STRING,
      cash_in_rdn: DataTypes.STRING,
      roi: DataTypes.STRING,
      user_id: DataTypes.INTEGER
    },
    {
      freezeTableName: true,
      tableName: "portofolios"
    },
    {
      classMethods: {
        associate: function(models) {
          // associations can be defined here
        }
      }
    }
  );
  return Model;
};
