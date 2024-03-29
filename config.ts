function getDatabaseUri() {

  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("TEST_DATABASE_URL:", process.env.TEST_DATABASE_URL);
  return process.env.NODE_ENV === "test"
      ? process.env.TEST_DATABASE_URL || "postgresql:///cadence_test"
      : process.env.DATABASE_URL || "postgresql:///cadence";
}

function getEnvVariable(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

const JWT_SECRET = getEnvVariable('JWT_SECRET');

export { getDatabaseUri };