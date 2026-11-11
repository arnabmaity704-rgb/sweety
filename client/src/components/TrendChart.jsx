import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatShort } from '../utils/dates.js';

/** Line chart of daily average / highest / lowest for the month to date. */
export default function TrendChart({ trend }) {
  if (trend.length < 2) {
    return <p className="empty-state">Add readings on at least two days this month to see a trend.</p>;
  }

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tickFormatter={formatShort} fontSize={12} />
          <YAxis domain={['auto', 'auto']} fontSize={12} unit="" />
          <Tooltip labelFormatter={formatShort} formatter={(v) => `${v} mg/dl`} />
          <Legend />
          <Line type="monotone" dataKey="highest" name="Highest" stroke="#dc2626" dot={false} />
          <Line type="monotone" dataKey="average" name="Average" stroke="#2563eb" strokeWidth={2} />
          <Line type="monotone" dataKey="lowest" name="Lowest" stroke="#16a34a" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
