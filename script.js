const locationButton = document.getElementById("location-button");
const cityForm = document.getElementById("city-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");

const statusMessage = document.getElementById("status-message");
const emptyState = document.getElementById("empty-state");
const weatherOutput = document.getElementById("weather-output");

const locationName = document.getElementById("location-name");
const recommendation = document.getElementById("recommendation");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const wind = document.getElementById("wind");
const rain = document.getElementById("rain");
const reason = document.getElementById("reason");

locationButton.addEventListener("click", useMyLocation);
cityForm.addEventListener("submit", searchCityWeather);

loadLastCity();

//use localstorage to keep cities
function loadLastCity() {
  const savedCity = localStorage.getItem("lastCity");

  if (savedCity) {
    cityInput.value = savedCity;
    getWeatherFromCity(savedCity);
  }
}

function setLoading(isLoading) {
  locationButton.disabled = isLoading;
  searchButton.disabled = isLoading;
}

function setStatus(message) {
  statusMessage.textContent = message;
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not available. Please search for a city instead.");
    return;
  }

  setLoading(true);
  setStatus("Getting your location...");

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      await getWeatherFromCoordinates(latitude, longitude, "Your Current Location");
      setLoading(false);
    },
    function () {
      setStatus("Location access was denied. Please search for a city instead.");
      setLoading(false);
    }
  );
}

async function searchCityWeather(event) {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (city === "") {
    setStatus("Please enter a city name.");
    return;
  }

  localStorage.setItem("lastCity", city);
  await getWeatherFromCity(city);
}

// turn a city name into latitude and longitude.
async function getWeatherFromCity(city) {
  setLoading(true);
  setStatus("Searching for city...");

  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      setStatus("City not found. Try another city.");
      setLoading(false);
      return;
    }

    const place = geoData.results[0];
    const placeName = `${place.name}, ${place.country}`;

    await getWeatherFromCoordinates(place.latitude, place.longitude, placeName);
  } catch (error) {
    setStatus("Could not search for that city right now.");
  }

  setLoading(false);
}

// use coordinates from first call
async function getWeatherFromCoordinates(latitude, longitude, placeName) {
  setStatus("Loading weather...");

  try {
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&forecast_days=1&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
    );

    const weatherData = await weatherResponse.json();

    const current = weatherData.current;
    const rainChance = weatherData.hourly.precipitation_probability[0];
    const weatherText = getWeatherText(current.weather_code);

    const result = makeRecommendation(
      current.temperature_2m,
      current.wind_speed_10m,
      rainChance,
      weatherText
    );

    showWeather(placeName, current.temperature_2m, weatherText, current.wind_speed_10m, rainChance, result);
    setStatus("Weather loaded.");
} catch(error){
  setStatus("Weather couldn't load");
}

//decision logic
function makeRecommendation(temp, windSpeed, rainChance, weatherText) {
  let message = "Great time to go outside";
  let explanation = "The weather looks comfortable for a short break.";

  if (temp < 50) {
    message = "Okay, but bring a jacket";
    explanation = "It is pretty cold outside right now.";
  }

  if (windSpeed > 18) {
    message = "Probably stay in";
    explanation = "It is very windy, so it may not feel pleasant outside.";
  }

  if (rainChance > 50 || weatherText.includes("Rain") || weatherText.includes("Storm")) {
    message = "Probably stay in";
    explanation = "There is a good chance of rain or rough weather.";
  }

  return {
    message,
    explanation
  };
}

function showWeather(placeName, temp, weatherText, windSpeed, rainChance, result) {
  emptyState.classList.add("hidden");
  weatherOutput.classList.remove("hidden");

  locationName.textContent = placeName;
  recommendation.textContent = result.message;
  temperature.textContent = `${Math.round(temp)} °F`;
  condition.textContent = weatherText;
  wind.textContent = `${Math.round(windSpeed)} mph`;
  rain.textContent = `${rainChance}%`;
  reason.textContent = result.explanation;
}

function getWeatherText(code) {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}}
