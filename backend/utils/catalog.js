function demoCatalogEnabled() {
  return process.env.DEMO_CATALOG_ENABLED === 'true';
}
const SHOWCASE_IDS = ['demo-iphone-15', 'demo-galaxy-s23', 'demo-ua-iphone-14', 'demo-eu-pixel-8'];

function isPublicProduct(product) {
  return Boolean(product && product.status !== 'draft' &&
    product.moderationStatus !== 'hidden' &&
    product.sellerAccountStatus !== 'suspended' &&
    (product.condition !== 'new' || product.id.startsWith('demo-') || product.sellerCanSellNew) &&
    (demoCatalogEnabled() || !product.id.startsWith('demo-') || SHOWCASE_IDS.includes(product.id)));
}

module.exports = { demoCatalogEnabled, isPublicProduct, SHOWCASE_IDS };
