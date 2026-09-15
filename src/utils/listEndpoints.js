/** Liste les routes Express 5 avec leurs préfixes (/api/admin/orders/:id/invoice). */
const MOUNTS = [
  '/api',
  '/uploads',
  '/categories',
  '/products',
  '/variations',
  '/orders',
  '/cart',
  '/promos',
  '/wishlist',
  '/legal',
  '/admin',
  '/stats',
  '/admins',
  '/returns',
  '/reviews',
];

function joinPaths(base, part) {
  if (!part || part === '/') return base || '/';
  const left = String(base || '').replace(/\/$/, '');
  const right = part.startsWith('/') ? part : `/${part}`;
  return `${left}${right}` || '/';
}

function mountOf(layer) {
  if (!layer || layer.slash || typeof layer.match !== 'function') return '';
  for (const guess of MOUNTS) {
    if (!layer.match(guess)) continue;
    const found = layer.path || guess;
    layer.path = undefined;
    layer.params = undefined;
    const normalized = String(found).replace(/\/$/, '') || '/';
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }
  return '';
}

function routeMethods(route) {
  return Object.keys(route.methods || {})
    .filter((method) => method !== '_all' && route.methods[method])
    .map((method) => method.toUpperCase());
}

function addEndpoint(endpoints, path, methods) {
  const existing = endpoints.find((item) => item.path === path);
  if (existing) {
    methods.forEach((method) => {
      if (!existing.methods.includes(method)) existing.methods.push(method);
    });
    return;
  }
  endpoints.push({ path, methods: [...methods], middlewares: [] });
}

function walk(stack, prefix, endpoints) {
  for (const layer of stack || []) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path)
        ? layer.route.path
        : [layer.route.path];
      const methods = routeMethods(layer.route);
      paths.forEach((routePath) => {
        addEndpoint(endpoints, joinPaths(prefix, routePath), methods);
      });
    } else if (layer.handle && layer.handle.stack) {
      walk(layer.handle.stack, joinPaths(prefix, mountOf(layer)), endpoints);
    }
  }
  return endpoints;
}

function listedEndpoints(expressApp) {
  const router = expressApp && (expressApp.router || expressApp._router);
  if (!router) return [];
  return walk(router.stack, '', []);
}

module.exports = listedEndpoints;
module.exports.joinPaths = joinPaths;
