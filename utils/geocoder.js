const keys = require("../keys");
const axios = require("axios");
const geocoder = async (location) => {
  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        address: location,
        key: keys.googleApiKey,
      },
    }
  );
  return response.data.results[0].geometry.location;
};

module.exports = geocoder;
