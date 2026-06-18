'use client';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
  ChartDataLabels,
);

// Disable datalabels globally — opt in per chart.
ChartJS.defaults.set('plugins.datalabels', { display: false });

ChartJS.defaults.font.family = "'Montserrat', sans-serif";
ChartJS.defaults.color = '#6b7280';
