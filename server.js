const express = require("express");
const keys = require("./keys");
const geocoder = require("./utils/geocoder");
const dfromlatlng = require("./utils/distancefromlatlng");
const app = express();
const { Pool } = require("pg");
const cors = require("cors");

app.use(express.json());
app.use(cors());

const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});
pgClient.on("error", () => console.log("Lost PG connection"));

app.post("/api/client/:street/:city/:postalCode/:country", async (req, res) => {
  const { city, postalCode, street, country } = req.params;
  const adress = street.concat(" ,", city, " ", postalCode, " ,", country);
  const location = await geocoder(adress);
  const latClient = location.lat;
  const lngClient = location.lng;
  const response = await pgClient.query(
    `SELECT name, id,lat,lng FROM public.commercial ORDER BY POINT(${latClient},${lngClient}) <-> geocode `
  );
  let distance = [];
  //Merge with response
  response.rows.map((commercial) => {
    const subDistance = {
      distance: Math.round(
        dfromlatlng.getDistanceFromLatLonInKm(
          latClient,
          lngClient,
          commercial.lat,
          commercial.lng
        )
      ),
      id: commercial.id,
    };
    distance.push(subDistance);
  });
  let nearBy = response.rows.map((item, i) =>
    Object.assign({}, item, distance[i])
  );
  res.status(200).send({ nearBy });
});
app.post("/api/commercial/all", async (req, res) => {
  const { rows } = await pgClient.query(
    "SELECT id,CONCAT(street, ', ', city ,' ',postalCode, ', ',country) AS adress FROM public.commercial "
  );
  rows.map(async (commercial) => {
    const location = await geocoder(commercial.adress);
    const lat = location.lat;
    const lng = location.lng;
    await pgClient.query(
      `UPDATE public.commercial SET lat=${lat},lng=${lng},geocode=POINT(${lat} ,${lng}) WHERE id =${commercial.id}`
    );
  });
  res.send({});
});
app.post("/api/new/:id", async (req, res) => {
  const { id } = req.params;
  const { rows } = await pgClient.query(
    `SELECT CONCAT(street, ', ', city ,' ',postalCode, ', ',country) AS adress FROM public.commercial where id=${id}`
  );
  const location = await geocoder(rows[0].adress);
  const lat = location.lat;
  const lng = location.lng;
  await pgClient.query(
    `UPDATE public.commercial SET lat=${lat},lng=${lng},geocode=POINT(${lat} ,${lng}) WHERE id =${id}`
  );

  res.send({});
});

const PORT = keys.serverPort || 5000;

app.listen(PORT, console.log(`Server running   on port ${PORT}`));
