
var express = require('express');
var cors = require('cors');


var app = express();
var cors = require('cors')
app.use(cors())

// view engine setup

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


const sql = require('mssql');

var config = {
  "user": "adminbda", //default is sa
  "password": "Password$",
  "server": "bdacovid.database.windows.net", // for local machine
  "database": "bdacovid", // name of database
  "options": {
    "encrypt": true
  }
}

sql.connect(config, err => {
  if(err) {
    console.log(err);
  }
  console.log("Connection Successful !");

  new sql.Request().query('select 1 as number', (err, result) => {
    return
  })

});

sql.on('error', err => {
  // ... error handler
  console.log("Sql database connection error " ,err);
})



const fetchData = async () => {


  try {
    // make sure that any items are correctly URL encoded in the connection string
    await sql.connect(config)
    const resEstados = await sql.query("" +
        "SELECT estado.nombre, covid_info.fecha, covid_info.nuevos_casos, covid_info.nuevas_muertes, estado.id FROM estado \n" +
        "INNER JOIN covid_info\n" +
        "ON covid_info.estado_id = estado.id ")


    //Filtramos los datos para agruparlos por estado
    const DATA = await resEstados.recordset.reduce(function (r, a) {
      r[a.nombre] = r[a.nombre] || [];
      r[a.nombre].push(a);
      return r;
    }, Object.create(null));

    //Buscamos en la base de datos la informacion de mexico pais
    const resPais = await sql.query("SELECT covid_info.fecha, SUM(covid_info.nuevos_casos) as nuevos_casos, SUM(covid_info.nuevas_muertes) as nuevas_muertes FROM estado \n" +
        "INNER JOIN covid_info\n" +
        "ON covid_info.estado_id = estado.id \n" +
        "GROUP By covid_info.fecha\n" +
        "ORDER BY  covid_info.fecha ")


    DATA["MEXICO PAIS"] = resPais.recordset;

    for(let key in DATA){
      for(let i = 0; i < DATA[key].length; i++){
        DATA[key][i].fecha = DATA[key][i].fecha.toLocaleDateString();
      }
    }



    return DATA;

  } catch (err) {
    console.log(err)
  }



}








app.get('/', function(req, res) {
    fetchData().then(data => {
      console.log(data)
        res.send(data);
    })
});

app.listen(3001, function () {
    console.log('Example app listening on port 3000!');
});
