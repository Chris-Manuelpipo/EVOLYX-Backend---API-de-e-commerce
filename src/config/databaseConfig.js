function envFlag(name) {
  const value = process.env[name];
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

function asText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function isLocalHost(host) {
  return !host || /^(localhost|127\.0\.0\.1|::1)$/i.test(host);
}

function parseConnectionString(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      user: decodeURIComponent(parsed.username || ''),
      database: parsed.pathname.replace(/^\//, '').split('/')[0],
      password: decodeURIComponent(parsed.password || ''),
    };
  } catch {
    return null;
  }
}

function requirePassword(password) {
  if (password === undefined || password === null || String(password) === '') {
    throw new Error('DB_PASSWORD ou DATABASE_URL requis');
  }
  return String(password);
}

function configFromUrl(connectionString) {
  const parsed = parseConnectionString(connectionString);
  if (!parsed || !parsed.database) {
    throw new Error('DATABASE_URL est invalide.');
  }
  return {
    mode: 'url',
    connectionString,
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    database: parsed.database,
    password: requirePassword(parsed.password),
  };
}

function resolveConfig() {
  const databaseUrl = asText(process.env.DATABASE_URL);
  if (databaseUrl) {
    return configFromUrl(databaseUrl);
  }

  const host = asText(process.env.DB_HOST);
  const user = asText(process.env.DB_USER);
  const database = asText(process.env.DB_NAME);
  const port = asText(process.env.DB_PORT) || '5432';

  if (host && user && database) {
    return {
      mode: 'discrete',
      host,
      port,
      user,
      database,
      password: requirePassword(process.env.DB_PASSWORD),
    };
  }

  const dbUrlAlias = asText(process.env.DB_URL);
  if (dbUrlAlias) {
    return configFromUrl(dbUrlAlias);
  }

  throw new Error('DB_PASSWORD ou DATABASE_URL requis');
}

function shouldUseSsl(host) {
  const forced = envFlag('DATABASE_SSL');
  if (forced === true) return true;
  if (forced === false) return false;
  return !isLocalHost(host);
}

function toPgOptions(cfg, { database } = {}) {
  const ssl = shouldUseSsl(cfg.host)
    ? { rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true' }
    : false;
  const dbName = database || cfg.database;

  if (cfg.mode === 'url') {
    const url = new URL(cfg.connectionString);
    url.pathname = `/${dbName}`;
    return { connectionString: url.toString(), ssl };
  }

  return {
    host: cfg.host,
    port: Number(cfg.port) || 5432,
    user: cfg.user,
    password: cfg.password,
    database: dbName,
    ssl,
  };
}

module.exports = {
  resolveConfig,
  shouldUseSsl,
  toPgOptions,
};
