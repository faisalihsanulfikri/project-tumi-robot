'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'transactions',
      'user_id', 
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id"
        },
        after: "status"
      }
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('transactions','user_id','signature');    
  }
};
