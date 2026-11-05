import React from 'react';

// Open-Meteo weather_code -> icon name
const DAY_SUNNY = [0];
const DAY_PARTLY = [1, 2];
const CLOUDY = [3];
const FOG = [45, 48];
const RAIN_LIGHT = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81];
const RAIN_STORM = [82, 95, 96, 99];
const SNOW = [71, 73, 75, 77, 85, 86];
const WIND = [];

function pickIcon(night, code) {
  if (RAIN_STORM.includes(code)) return 'thunderstorm';
  if (SNOW.includes(code)) return 'snow';
  if (RAIN_LIGHT.includes(code)) return 'rain-light';
  if (FOG.includes(code)) return 'fog';
  if (CLOUDY.includes(code)) return night ? 'cloudy-night' : 'cloudy-day';
  if (DAY_PARTLY.includes(code)) return night ? 'partly-cloudy-night' : 'partly-cloudy-day';
  if (DAY_SUNNY.includes(code)) return night ? 'sunny-night' : 'sunny-day';
  return night ? 'partly-cloudy-night' : 'sunny-day';
}

export default function WeatherArt({ night = false, code = 0 }) {
  const name = pickIcon(night, code);
  return (
    <img
      className="hero-art-img"
      src={`./assets/icons/weather/${name}.png`}
      alt=""
      draggable={false}
    />
  );
}
