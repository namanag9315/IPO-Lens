interface EmptyChartStateProps {
  message: string;
}

export default function EmptyChartState({ message }: EmptyChartStateProps) {
  return (
    <div className="chart-empty-state">
      <strong>Data not available yet</strong>
      <span>{message}</span>
    </div>
  );
}
