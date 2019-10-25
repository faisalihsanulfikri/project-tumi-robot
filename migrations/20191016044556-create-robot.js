"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("Robots", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id"
        }
      },
      security_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "securities",
          key: "id"
        }
      },
      status: {
        type: Sequelize.STRING
      },
      off_message: {
        type: DataTypes.ENUM,
        values: ["on", "off"],
        defaultValue: "off"
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("Robots");
  }
};
