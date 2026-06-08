import base from "@ludenlab/config/eslint/base";

const baseConfig = Array.isArray(base) ? base : [base];

// Prisma generated client (src/generated) lint dışı — üretilen kod.
export default [...baseConfig, { ignores: ["src/generated/**"] }];
