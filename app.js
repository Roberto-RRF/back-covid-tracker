var Solver = require("3x3-equation-solver");
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

app.get("/prediccion1", function(req, res) {
  let date1 = req.body.date1
  let date2 = req.body.date2
  let estado = req.body.estado

  date1 = new Date(date1);
  date2 = new Date(date2);

  //Calcular punto medio de dos fechas
  const fecha_medio = new Date(date1.getTime() + (date2.getTime() - date1.getTime()) / 2);


  fetchData().then(data => {
      //Obtener ultimos 30 elementos
      const last30 = data[estado].slice(-30);
      let suma = 0;
      for(let i = 0; i < last30.length; i++){
        suma += parseInt(last30[i].nuevos_casos);
      }

      let res1 = 0;
      for(let i = 0; i <30; i++){
        res1 += parseInt(last30[i].nuevos_casos) * i;
      }

      let res2= 0;
      for(let i = 0; i <30; i++){
        res2 += parseInt(last30[i].nuevos_casos) * i*i;
      }

      let resultado = Solver([
        [30,  435, 8555, suma ]
        , [435,  8555,  189225, res1]
        , [8555, 189225, 4463999 , res2]
      ], true);

      //Calcular diferencia dias
      let fecha = new Date(fecha_medio);
      let fechaActual = new Date();
      let diferencia = fechaActual.getTime() - fecha.getTime();
      let dias = Math.round(diferencia / (1000 * 60 * 60 * 24)) -1;

      const y = reslulatado.result[0] + reslulatado.result[1] * dias + reslulatado.result[2] * dias * dias;

      const promedio = suma / 30;

      if(promedio > y){
        //Poca posibilidad de contagio
        res.send("Poca posibilidad de contagio");
      }
      if(promedio === y){
        //Posibilidad de contagio moderada
        res.send("Posibilidad de contagio moderadas");
      }
      else{
        //Hay posibilidad de contagio
        res.send("Hay posibilidad de contagio");
      }


      console.log(resultado.result)
  })
});

app.listen(3001, function () {
    console.log('Example app listening on port 3000!');
});
