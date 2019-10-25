require("dotenv").config(); //instatiate environment variables

let APP_CONFIG = {}; //Make this global to use all over the application

APP_CONFIG.app = process.env.APP || "dev";
APP_CONFIG.port = process.env.PORT || "3000";

APP_CONFIG.db_dialect = process.env.DB_DIALECT || "mysql";
APP_CONFIG.db_host = process.env.DB_HOST || "127.0.0.1";
APP_CONFIG.db_port = process.env.DB_PORT || "3306";
APP_CONFIG.db_name = process.env.DB_NAME || "robotumi";
APP_CONFIG.db_user = process.env.DB_USER || "root";
APP_CONFIG.db_password = process.env.DB_PASSWORD || "";

APP_CONFIG.jwt_encryption = process.env.JWT_ENCRYPTION || "jwt_please_change";
APP_CONFIG.jwt_expiration = process.env.JWT_EXPIRATION || "10000";

APP_CONFIG.default_password_user = process.env.DEFAULT_PASS_USER_TUMI || "8888";

module.exports = APP_CONFIG;
