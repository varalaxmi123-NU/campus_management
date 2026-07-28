// Keep this in sync with frontend/src/constants/institutions.js
// Server-side validation must never trust the client alone.
const INSTITUTIONS = [
  { name: "NMAM Institute of Technology (Nitte)", domain: "nmamit.com" },
  { name: "NITK Surathkal", domain: "nitk.com" },
  { name: "MIT Manipal", domain: "mit.com" },
  { name: "PES University", domain: "pes.com" },
  { name: "RV College of Engineering", domain: "rv.com" },
  { name: "BMS College of Engineering", domain: "bms.com" },
  { name: "MS Ramaiah Institute of Technology", domain: "msrit.com" },
  { name: "Dayananda Sagar College of Engineering", domain: "dayananda.com" },
  { name: "CMR Institute of Technology", domain: "cmr.com" },
  { name: "New Horizon College of Engineering", domain: "new.com" },
];

module.exports = INSTITUTIONS;
