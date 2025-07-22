require("dotenv").config();
const app = require("./app.js");
 const { connect } = require("./Database/index.js");
 require("./Model/associations.js");

const PORT = process.env.PORT;

(async () => {
  try {
    await connect();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

app.get('/', (req, res) => {
  res.send('Hello World!');
});
