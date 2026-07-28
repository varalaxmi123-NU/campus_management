// Fixed whitelist of institutions allowed to register an Admin account.
// Keeping this list closed (instead of a free-text name) means a random
// person can't just type any college name and register as its admin.
//
// The "domain" is the required email domain for that institution's admin
// account. These are simplified, easy-to-remember demo domains (not the
// colleges' real official domains) since this is a college project, not
// a production deployment - pick whatever's easiest for you to type.
export const INSTITUTIONS = [
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
