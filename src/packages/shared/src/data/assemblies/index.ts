import { internetAppAssembly } from "./internet-app";
import { testEnvAssembly } from "./test-env";
import { dataPlatformAssembly } from "./data-platform";
import { haProductionAssembly } from "./ha-production";

export { internetAppAssembly, testEnvAssembly, dataPlatformAssembly, haProductionAssembly };

export const allAssemblies = [internetAppAssembly, testEnvAssembly, dataPlatformAssembly, haProductionAssembly];
