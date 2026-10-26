import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demo,ping,validateNetwork} from '../src/network.ts';
test('LAN: éxito, desconexión, energía, máscara y duplicados',()=>{
 const n=demo();assert.deepEqual(ping(n,'PC','192.168.1.102').path,['PC','Switch','Laptop']);
 const disconnected=demo();disconnected.links=disconnected.links.filter(l=>l.id!=='sl');assert.equal(ping(disconnected,'PC','192.168.1.102').ok,false);
 for(const id of ['PC','Switch','Laptop']){const off=demo();off.devices.find(d=>d.id===id)!.on=false;assert.equal(ping(off,'PC','192.168.1.102').ok,false);}
 const mask=demo();mask.devices.find(d=>d.id==='PC')!.prefix=30;mask.devices.find(d=>d.id==='Laptop')!.ip='192.168.1.105';assert.match(ping(mask,'PC','192.168.1.105').message,/Subred/);
 const duplicate=demo();duplicate.devices[0].ip='192.168.1.102';assert.match(ping(duplicate,'PC','192.168.1.102').message,/duplicada/);
});
test('valida puertos exclusivos y rechaza enlaces inexistentes',()=>{
 const n=demo();assert.deepEqual(validateNetwork(n),n);n.links.push({id:'bad',a:'PC',b:'Laptop',ap:0,bp:0});assert.throws(()=>validateNetwork(n));
 const missing=demo();missing.links[0].b='missing';assert.throws(()=>validateNetwork(missing));
});
