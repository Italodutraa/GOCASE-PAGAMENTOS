import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // papaparse e leitura de ./pagamentos rodam só no servidor
  serverExternalPackages: ["papaparse"],
};

export default nextConfig;
