export function ownsListing(user, product) {
  return Boolean(user?.id && product?.sellerId && user.id === product.sellerId);
}

export function canBuyListing(user, product) {
  return Boolean(product && !ownsListing(user, product) && !product.isDemo &&
    product.stock > 0 && (!product.status || product.status === 'active') &&
    (!product.moderationStatus || product.moderationStatus === 'approved') && product.sellerAccountStatus !== 'suspended');
}

export const ownerCopy = {
  uk: { own: 'Ваше оголошення', text: 'Це ваш товар. Повідомлення, торг, відстеження ціни й покупка доступні іншим користувачам.', edit: 'Редагувати оголошення', manage: 'Мої оголошення', messages: 'Повідомлення покупців', unavailable: 'Товар недоступний для покупки', cart: 'У кошику є ваше оголошення. Видаліть його перед оформленням.', remove: 'Прибрати власні товари' },
  pl: { own: 'Twoje ogłoszenie', text: 'To Twój produkt. Wiadomości, negocjacje, obserwowanie ceny i zakup są dostępne dla innych użytkowników.', edit: 'Edytuj ogłoszenie', manage: 'Moje ogłoszenia', messages: 'Wiadomości od kupujących', unavailable: 'Produkt niedostępny do zakupu', cart: 'Koszyk zawiera Twoją ofertę. Usuń ją przed zakupem.', remove: 'Usuń własne produkty' },
  en: { own: 'Your listing', text: 'This is your product. Messaging, negotiation, price watches and purchasing are available to other users.', edit: 'Edit listing', manage: 'My listings', messages: 'Buyer messages', unavailable: 'Product unavailable for purchase', cart: 'Your cart contains your own listing. Remove it before checkout.', remove: 'Remove own listings' },
};
