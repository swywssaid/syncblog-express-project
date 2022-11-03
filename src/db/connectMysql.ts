import config from '../../config';

const mysql = require('mysql');

const mysqlDB = mysql.createConnection({
  host: config.mysql.host,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
});
// connection.connect();
// connection.query('SELECT * from blogmanage', (error: any, results: any, fields: any) => {
//   if (error) {
//     console.log(error);
//   }
//   console.log(results);
// });

// connection.end();
export default mysqlDB;
