// Facts checked against the linked manufacturer pages; configuration stays with the seller.
module.exports = [
  { category: 'Smartfony', brand: 'Xiaomi', model: 'Mi 6', source: 'Xiaomi reference', sourceUrl: 'https://www.mi.com/es/mi6/specs/',
    sources: [{ title: 'Xiaomi: Mi 6 specifications', url: 'https://www.mi.com/es/mi6/specs/' }, { title: 'Xiaomi: Mi 6 CN variants', url: 'https://www.mi.com/mi6/specs' }],
    choices: { ram: ['4 GB', '6 GB'] },
    specs: { processor: 'Snapdragon 835', screen: '5.15″', resolution: '1920 × 1080', ramType: 'LPDDR4X', battery: '3350 mAh', charging: '18 W; Quick Charge 3.0', mainCamera: '12 MP wide + 12 MP telephoto', frontCamera: '8 MP', cameraFeatures: 'OIS; 4K at 30 fps', connectivity: '4G LTE, Wi-Fi 802.11ac, Bluetooth 5.0, NFC, USB-C', wifi: '802.11ac', bluetooth: '5.0', weight: '168 g' } },
  { category: 'Smartfony', brand: 'realme', model: 'GT3', source: 'realme reference', sourceUrl: 'https://www.realme.com/my/realme-gt-3/specs',
    specs: { processor: 'Snapdragon 8+ 5G (4 nm)', screen: '6.74″', displayType: 'AMOLED', resolution: '2772 × 1240', refreshRate: '144 Hz', ramType: 'LPDDR5X', battery: '4600 mAh', charging: '240 W SUPERVOOC', mainCamera: '50 MP + 8 MP + 2 MP', frontCamera: '16 MP', cameraFeatures: 'OIS', features: 'NFC; infrared', connectivity: '5G, Wi-Fi 2.4/5 GHz, Bluetooth 5.3, USB-C', wifi: '2.4 GHz / 5 GHz', bluetooth: '5.3', weight: '199 g', os: 'Android 13; realme UI 4.0' } },
  { category: 'Gaming', brand: 'Sony', model: 'PlayStation 5', source: 'Sony reference', sourceUrl: 'https://blog.playstation.com/2020/03/18/unveiling-new-details-of-playstation-5-hardware-technical-specs/',
    choices: { storage: ['825 GB', '1 TB'] },
    specs: { platform: 'PlayStation 5', processor: 'AMD Ryzen Zen 2; 8 cores / 16 threads', ram: '16 GB GDDR6', gpu: 'AMD RDNA 2', resolution: 'Up to 4K' } },
];
