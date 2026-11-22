// Sources are attached to every reference result for inspection in the listing form.
module.exports = [{
  brand: 'Apple',
  model: 'iPhone 11',
  sourceUrl: 'https://support.apple.com/en-us/111865',
  sources: [
    { title: 'Apple: iPhone 11 technical specifications', url: 'https://support.apple.com/en-us/111865' },
    { title: 'iFixit: iPhone 11 hardware teardown', url: 'https://www.ifixit.com/News/33016/iphone-11-teardown' },
    { title: 'Notebookcheck: iPhone 11 hardware review', url: 'https://www.notebookcheck.net/Apple-iPhone-11-Smartphone-Review-More-than-just-an-affordable-Apple-smartphone.435087.0.html' },
  ],
  choices: {
    color: ['Black', 'Green', 'Yellow', 'Purple', 'Red', 'White'],
    storage: ['64 GB', '128 GB', '256 GB'],
    sim: ['nano-SIM + eSIM', 'Dual nano-SIM (China / Hong Kong / Macao)'],
  },
  specs: {
    screen: '6.1″', displayType: 'IPS LCD (Liquid Retina HD)', resolution: '1792 × 828',
    refreshRate: '60 Hz', displayFeatures: 'True Tone, P3, Haptic Touch, 625 nits',
    processor: 'Apple A13 Bionic', ram: '4 GB', ramType: 'LPDDR4X',
    storage: '64 GB / 128 GB / 256 GB', battery: '3110 mAh',
    charging: 'USB Power Delivery; Qi; 50% in 30 min with 20 W+ adapter',
    mainCamera: '12 MP wide (f/1.8, OIS) + 12 MP ultra-wide (f/2.4)',
    frontCamera: '12 MP TrueDepth (f/2.2)',
    cameraFeatures: 'Night mode, Deep Fusion, Smart HDR, 4K video up to 60 fps',
    features: 'Face ID, NFC, U1, stereo speakers, IP68',
    os: 'iOS', connectivity: '4G LTE, Wi-Fi 6, Bluetooth 5.0, NFC, Lightning',
    wifi: 'Wi-Fi 6 (802.11ax)', bluetooth: '5.0', weight: '194 g',
  },
}];
