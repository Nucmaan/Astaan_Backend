require("dotenv").config();

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000,
    },
  },
};
