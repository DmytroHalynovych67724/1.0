const test=require('node:test');
const assert=require('node:assert/strict');
const {validProductCode,hasProductCode,referenceMatchesCode}=require('../backend/services/deviceProductCode');
const {findDeviceSpecs}=require('../backend/services/deviceSpecs');
const {findAiDeviceSpecs}=require('../backend/services/aiDeviceSpecs');
const {normalizeDeviceDetails,validateDeviceDetails}=require('../backend/utils/deviceCondition');

test('product codes are bounded identifiers, literal matches and persist with listing details',()=>{
  for(const code of ['21JK00Q8TH','6F2A1EA#ABU','UX3402ZA-KM123','ABC.123']) assert.equal(validProductCode(code),true);
  for(const code of ['ab','a'.repeat(51),'SKU with spaces','https://example.com',{}]) assert.equal(validProductCode(code),false);
  assert.equal(hasProductCode('ABCx123','ABC.123'),false);
  assert.equal(hasProductCode('SKU: abc.123','ABC.123'),true);
  assert.equal(hasProductCode('21JK00Q8THX','21JK00Q8TH'),false);
  const errors=[];const details=validateDeviceDetails({productCode:'21JK00Q8TH'},errors);
  assert.deepEqual(errors,[]);assert.equal(normalizeDeviceDetails(details).productCode,'21JK00Q8TH');
});

test('exact SKU lookup cannot silently use another Icecat configuration or a family fallback',async()=>{
  const requests=[];
  const options={category:'Laptopy',productCode:'21JK00Q8TH',icecatLookup:async id=>{requests.push(id);return {brand:'Lenovo',model:'ThinkPad E14 Gen 5',productCode:'21JK00Q8TH',specs:{ram:'16 GB',storage:'512 GB'}};},wikiLookup:async()=>{throw new Error('Family lookup must not run');}};
  const [result]=await findDeviceSpecs('Lenovo ThinkPad E14 Gen 5',options);
  assert.equal(requests[0].productCode,'21JK00Q8TH');assert.equal(result.configurationMatched,true);assert.equal(result.specs.ram,'16 GB');
  assert.deepEqual(await findDeviceSpecs('Lenovo ThinkPad E14 Gen 5',{...options,icecatLookup:async()=>({...result,productCode:'21JK0002US'})}),[]);
  assert.deepEqual(await findDeviceSpecs('Lenovo ThinkPad E14 Gen 5',{...options,icecatLookup:async()=>null}),[]);
});

test('a family table listing multiple SKUs is not evidence for one configuration',()=>{
  assert.equal(referenceMatchesCode({text:'21JK00Q8TH processor A; 21JK00Q9TH processor B'},'21JK00Q8TH'),false);
  assert.equal(referenceMatchesCode({text:'Product code: 21JK00Q8TH. Processor A.'},'21JK00Q8TH'),true);
  assert.equal(referenceMatchesCode({title:'21JK00Q8TH',text:'Specifications'},'21JK00Q8TH'),true);
});

test('AI may fill RAM and storage only from the exact laptop SKU and never family specifications',async()=>{
  const options={category:'Laptopy',productCode:'21JK00Q8TH',findSpecs:async()=>[],fetchSource:async()=>{throw new Error('Generic Wikipedia must not run');},
    searchSources:async candidate=>{assert.equal(candidate.productCode,'21JK00Q8TH');return {status:'ready',sources:[{title:'Lenovo 21JK00Q8TH',url:'https://psref.lenovo.com/21JK00Q8TH',text:'Product 21JK00Q8TH. RAM: 16 GB. SSD: 512 GB. Processor: Core i5-1345U.'}]};},
    requestJson:async (_prompt,input)=>input.name?{candidates:[{brand:'Lenovo',model:'ThinkPad E14 Gen 5'}]}:{fields:[
      {key:'ram',value:'16 GB',quote:'RAM: 16 GB.',sourceId:'source-1'},
      {key:'storage',value:'512 GB',quote:'SSD: 512 GB.',sourceId:'source-1'},
      {key:'processor',value:'Core i5-1345U',quote:'Processor: Core i5-1345U.',sourceId:'source-1'},
    ]},
  };
  const {results:[result]}=await findAiDeviceSpecs('Lenovo ThinkPad E14 Gen 5',options);
  assert.equal(result.configurationMatched,true);assert.equal(result.specs.ram,'16 GB');assert.equal(result.specs.storage,'512 GB');
  const {results:[unknown]}=await findAiDeviceSpecs('Lenovo ThinkPad E14 Gen 5',{...options,searchSources:async()=>({status:'ready',sources:[{title:'ThinkPad E14 Gen 5',url:'https://lenovo.com/family',text:'RAM: 16 GB. SSD: 512 GB. Processor: Core i5-1345U.'}]})});
  assert.equal(unknown.configurationMatched,false);assert.deepEqual(unknown.specs,{});
});


test('web references require both the exact code and matching laptop model',()=>{
  const {referenceResults}=require('../backend/services/deviceWebSearch');
  const candidate={brand:'Lenovo',model:'ThinkPad E14 Gen 5',productCode:'21JK00Q8TH'};
  const text='Lenovo ThinkPad E14 Gen 5. Product 21JK00Q8TH. Processor: Core i5-1345U. RAM: 16 GB.';
  const sources=referenceResults({results:[
    {title:'Specifications - Lenovo PSREF',url:'https://psref.lenovo.com/Detail/ThinkPad/ThinkPad_E14_Gen_5_Intel?M=21JK00Q8TH',content:text},
    {title:'Lenovo ThinkPad E14 Gen 5',url:'https://www.notebookcheck.net/ThinkPad-E14.html',content:'General family specifications, RAM up to 40 GB. Several processors are available.'},
  ]},candidate);
  assert.equal(sources.length,1);
  assert.ok(sources[0].url.includes('21JK00Q8TH'));
  assert.equal(referenceResults({results:[{title:'Lenovo ThinkPad X1 Gen 9 21JK00Q8TH',url:'https://lenovo.com/21JK00Q8TH',content:'ThinkPad X1 Gen 9. Different family, different factory configuration. RAM: 16 GB.'}]},candidate).length,0);
});


test('platform identifiers cannot match longer configuration codes',()=>{
  assert.equal(hasProductCode('AN515-58-57AN','AN515-58'),false);
  assert.equal(hasProductCode('Part: NH.QFJAA.003.1','NH.QFJAA.003'),false);
  assert.equal(hasProductCode('Part: NH.QFJAA.003','NH.QFJAA.003'),true);
  assert.equal(referenceMatchesCode({title:'Acer Nitro 5 AN515-58',text:'Series AN515-58. Configurations: AN515-58-57AN, AN515-58-7578.'},'AN515-58'),false);
  assert.equal(referenceMatchesCode({title:'Acer Nitro 5',url:'https://www.acer.com/ca-en/laptops/nitro/nitro-5/pdp/NH.QFJAA.003'},'NH.QFJAA.003'),true);
  assert.equal(referenceMatchesCode({url:'https://psref.lenovo.com/Detail/ThinkPad?M=21JK00Q8TH'},'21JK00Q8TH'),true);
  assert.equal(referenceMatchesCode({url:'https://example.com/AN515-58-57AN.html'},'AN515-58'),false);
  assert.equal(referenceMatchesCode({url:'https://example.com/AN515-58-57AN.html'},'AN515-58-57AN'),true);
});


test('retailer configuration facts are explicitly attributed and require seller review',async()=>{
  const result=await findAiDeviceSpecs('Acer Nitro 5',{category:'Laptopy',productCode:'AN515-58-58GJ',findSpecs:async()=>[],
    searchSources:async()=>({status:'ready',sources:[{commercial:true,title:'Acer Nitro 5 AN515-58-58GJ',url:'https://www.mironet.cz/acer-nitro-5-58gj',text:'Code AN515-58-58GJ. RAM: 16 GB. SSD: 1 TB.'}]}),
    requestJson:async(_prompt,input)=>input.name?{candidates:[{brand:'Acer',model:'Nitro 5'}]}:{fields:[{key:'ram',value:'16 GB',quote:'RAM: 16 GB.',sourceId:'source-1'},{key:'storage',value:'1 TB',quote:'SSD: 1 TB.',sourceId:'source-1'}]},
  });
  assert.equal(result.results[0].specs.ram,'16 GB');assert.equal(result.results[0].configurationSource,'retailer');assert.equal(result.results[0].source,'Retailer catalog');assert.equal(result.ai.reviewRequired,true);
});


test('SEO link suffixes cannot masquerade as a longer hardware configuration code',()=>{
  assert.equal(referenceMatchesCode({title:'Acer Nitro 5 AN515-58-58GJ',text:'[Details](https://www.mironet.cz/acer-an515-58-58gj-i5-12450h-16gb-ram). Configuration AN515-58-58GJ. RAM: 16 GB.'},'AN515-58-58GJ'),true);
  assert.equal(referenceMatchesCode({title:'Acer Nitro 5 AN515-58',text:'Model AN515-58-58GJ, processor A. Model AN515-58-57AN, processor B.'},'AN515-58'),false);
});
