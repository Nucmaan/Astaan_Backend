// Converts "4.30" => 4 hours 30 minutes => 270 minutes
function parseCustomTimeToMinutes(value) {
    if (typeof value === "number") value = value.toString();
    if (!value) return 0;
    if (value.includes(".")) {
      const [h, m] = value.split(".");
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    } else {
      // If value is less than 60, treat as minutes, else as hours
      const num = parseInt(value, 10);
      if (num <= 59) return num;
      return num * 60;
    }
  }
  module.exports = { parseCustomTimeToMinutes };