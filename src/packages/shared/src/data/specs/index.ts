import { computeSpecs } from "./compute";
import { databaseSpecs } from "./database";
import { middlewareSpecs } from "./middleware";
import { networkSpecs } from "./network";
import { paasSpecs } from "./paas";
import { securitySpecs } from "./security";
import { dcSpecs } from "./dc";

export const allAtomicSpecs = [
  ...computeSpecs,
  ...databaseSpecs,
  ...middlewareSpecs,
  ...networkSpecs,
  ...paasSpecs,
  ...securitySpecs,
  ...dcSpecs,
];
