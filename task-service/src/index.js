require("dotenv").config();

const app = require("./app.js");
const sequelize = require("./Database/index.js");
const Task = require("./Model/TasksModel.js");
require("./Model/associations.js");

const PORT = process.env.PORT;

sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection successful!");

     return sequelize.sync({ force: false }); // Use force: true only in development (drops & recreates tables)
  })
  .then(() => {
    console.log("Database synced successfully!");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

app.get('/', (req, res) => {
  res.send('Hello World!')
})

