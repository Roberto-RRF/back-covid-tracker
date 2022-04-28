const functions = require("firebase-functions");
const sql = require("mssql")


// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions


const config = {
    "user": "adminbda", //default is sa
    "password": "Password$",
    "server": "bdacovid.database.windows.net", // for local machine
    "database": "bdacovid", // name of database
    "options": {
        "encrypt": true
    }
}


async function fetchData (){

let DATA = []

try {
    // make sure that any items are correctly URL encoded in the connection string
    await sql.connect(config)

    const resEstados = await sql.query("" +
        "SELECT estado.nombre, covid_info.fecha, covid_info.nuevos_casos, covid_info.nuevas_muertes, estado.id FROM estado \n" +
        "INNER JOIN covid_info\n" +
        "ON covid_info.estado_id = estado.id ")

    //Filtramos los datos para agruparlos por estado
    DATA = await resEstados.recordset.reduce(function (r, a) {
        r[a.nombre] = r[a.nombre] || [];
        r[a.nombre].push(a);
        return r;
    }, Object.create(null));

    //Buscamos en la base de datos la informacion de mexico pais
    const resPais = await sql.query("SELECT covid_info.fecha, SUM(covid_info.nuevos_casos) as casos, SUM(covid_info.nuevas_muertes) as muertes FROM estado \n" +
        "INNER JOIN covid_info\n" +
        "ON covid_info.estado_id = estado.id \n" +
        "GROUP By covid_info.fecha\n" +
        "ORDER BY  covid_info.fecha ")


    DATA["MEXICO PAIS"] = resPais.recordset;

    return DATA;

} catch (err) {
    console.log(err)
}
}


exports.helloWorld = functions.https.onRequest((req, res) => {
    fetchData().then(data => {
        res.send(data)
    }).catch(err => {
        res.send(err)
    })

});
