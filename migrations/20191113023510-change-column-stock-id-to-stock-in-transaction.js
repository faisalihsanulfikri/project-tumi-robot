'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn("transactions", "stock_id",{forced:true}),
      queryInterface.addColumn('transactions','stock',{
        type: Sequelize.STRING,
        after: 'id',
      })
    ])

  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn("transactions", "stock",{forced:true}),
      queryInterface.addColumn('transactions','stock_id',{
        type:Sequelize.INTEGER,
        references: {
          model: "stocks",
          key: "id"
        },
        after: 'id'
      })
    ])
  }
};