'use strict';
module.exports = (sequelize, DataTypes) => {
  var Model = sequelize.define('Portofolio', {
    starting_balance: DataTypes.STRING,
    available_limit: DataTypes.STRING,
    funding_available: DataTypes.STRING,
    total_asset: DataTypes.STRING,
    cash_in_rdn: DataTypes.STRING,
    profit_lost: DataTypes.STRING,
    roi: DataTypes.STRING,
    stock_id: DataTypes.INTEGER,
    avg_buy: DataTypes.STRING,
    last: DataTypes.STRING,
    ot: DataTypes.STRING,
    gross_value: DataTypes.STRING,
    market_value: DataTypes.STRING,
    pl_price: DataTypes.STRING,
    pl_percent: DataTypes.STRING,
    stock_id: DataTypes.INTEGER,

  }, 
  {
    freezeTableName: true,
    tableName: "portofolios"
  },{
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Model;
};