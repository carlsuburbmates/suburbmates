import assert from "node:assert/strict";
import { displayDirectoryStreetAddress } from "../web/src/lib/directory-location";

assert.equal(displayDirectoryStreetAddress(null), null);
assert.equal(
  displayDirectoryStreetAddress("45 JOHNSON STREET, VIC 3073"),
  "45 Johnson Street, VIC 3073",
);
assert.equal(
  displayDirectoryStreetAddress("1D BOWER ST NORTHCOTE VIC 3070"),
  "1D Bower St Northcote VIC 3070",
);
assert.equal(
  displayDirectoryStreetAddress("21-23 Railway Place, Fairfield VIC 3078"),
  "21-23 Railway Place, Fairfield VIC 3078",
);

console.log("Directory address presentation checks passed.");
