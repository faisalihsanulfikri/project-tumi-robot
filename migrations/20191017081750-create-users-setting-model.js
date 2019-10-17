"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("users_setting.models", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      master_setting_id: {
        type: Sequelize.INTEGER
      },
      config_value: {
        type: Sequelize.ENUM,
        defaultValue: "value"
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defa
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("users_setting.models");
  }
};
