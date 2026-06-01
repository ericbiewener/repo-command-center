const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export const formatRelativeTime = (updatedAtEpoch: number | null) => {
  if (!updatedAtEpoch) {
    return "unknown";
  }

  const deltaSeconds = Math.round((updatedAtEpoch - Date.now()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);
  const unit =
    absSeconds < 60
      ? "second"
      : absSeconds < 3600
        ? "minute"
        : absSeconds < 86400
          ? "hour"
          : absSeconds < 2592000
            ? "day"
            : "month";
  const divisor =
    unit === "second"
      ? 1
      : unit === "minute"
        ? 60
        : unit === "hour"
          ? 3600
          : unit === "day"
            ? 86400
            : 2592000;

  return rtf.format(Math.round(deltaSeconds / divisor), unit);
};

export const formatAbsoluteDate = (updatedAt: string) =>
  updatedAt ? new Date(updatedAt).toLocaleString() : "Unknown update time";
