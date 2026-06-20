//Taken from: https://tech.mybuilder.com/determining-if-an-ipv4-address-is-within-a-cidr-range-in-javascript/


// Ex: isIp4InCidrs('192.168.1.5', ['10.10.0.0/16', '192.168.1.1/24']); // true
// Ex: calculateCidrRange('192.168.1.0/24'); // ["192.168.1.0", "192.168.1.255"]
// Ex: intToBin(ip4ToInt('192.168.1.1')); // 11000000.10101000.00000001.00000001


function parseCIDR(ip) {
    if(ip.indexOf("_")<0){
      ip = ip.match(/^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[01]|[1-9][0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[01]|[1-9][0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[01]|[1-9][0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[01]|[1-9][0-9])(?:\/(3[0-2]|2[0-9]|1[0-9]|[1-9]?))?$/);
      if(ip!==null)  {
        return ip;   
      }
      else 
        return false;
    }else{
      if(ip.length<64){
        return ip;
      }
    }
}

function verifyIP4(address) {
    var ip4DecimalPattern = '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$';
    var ip4HexPattern = '^(?:(?:0x[0-9a-f]{1,2})\.){3}(?:0x[0-9a-f]{1,2})$';
    var ip4OctalPattern = '^(?:(?:03[1-7][0-7]|0[12][0-7]{1,2}|[0-7]{1,2})\.){3}(?:03[1-7][0-7]|0[12][0-7]{1,2}|[0-7]{1,2})$';
  
    var isIP4Decimal = isIP4Hex = isIP4Octal = false;
    var base = 10;
  
    isIP4Decimal = address.match(ip4DecimalPattern) != null;
    isIP4Hex = address.match(ip4HexPattern) != null;
    isIP4Octal = address.match(ip4OctalPattern) != null;
  
    if (isIP4Hex || isIP4Octal) {
      if (isIP4Hex) {
        base = 16;
      } else if (isIP4Octal) {
        base = 8;
      }
      return address.split('.').map(num => parseInt(num, base)).join('.');
    }
    return false;
  }

const ip4ToInt = ip => ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;

const isIp4InCidr = ip => cidr => {
  const [range, bits = 32] = cidr.split('/');
  const mask = ~(2 ** (32 - bits) - 1);
  return (ip4ToInt(ip) & mask) === (ip4ToInt(range) & mask);
};

const isIp4InCidrs = (ip, cidrs) => cidrs.some(isIp4InCidr(ip));

// Ex: isIp4InCidrs('192.168.1.5', ['10.10.0.0/16', '192.168.1.1/24']); // true


const intToIp4 = int =>
  [(int >>> 24) & 0xFF, (int >>> 16) & 0xFF,
   (int >>> 8) & 0xFF, int & 0xFF].join('.');

const calculateCidrRange = cidr => {
  const [range, bits = 32] = cidr.split('/');
  const mask = ~(2 ** (32 - bits) - 1);
  return [intToIp4(ip4ToInt(range) & mask), intToIp4(ip4ToInt(range) | ~mask)];
};

// Ex: calculateCidrRange('192.168.1.0/24'); // ["192.168.1.0", "192.168.1.255"]


const intToBin = int => (int >>> 0).toString(2).padStart(32, 0).match(/.{1,8}/g).join('.');

// Ex: intToBin(ip4ToInt('192.168.1.1')); // 11000000.10101000.00000001.00000001

const invalid_ranges = ['10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '255.255.255.255/32'];

function ACLisValidCIDR(entry)
{
   var grps = parseCIDR(entry);
   if(!grps) return false;

   var mask = 32;
   var ip = grps[1]+'.'+grps[2]+'.'+grps[3]+'.'+grps[4];

   //no mask
   if(typeof grps[5] === 'undefined' || grps[5].length<1){
    console.log('Ip: '+ip);
   }
   //with mask
   else{
    mask = grps[5];
    console.log('Ip: '+ip);
    console.log('Mask: '+mask);
   }

   if(isIp4InCidrs(ip, invalid_ranges)){
     console.log('Invalid Entry: Restricted address range');
     return false;
   }
   
   return [ip, mask];
   //console.log
}


function ACLIPisValid(entry)
{
   var grps = parseCIDR(entry);
   if(!grps) return false;

   var mask = 32;
   var ip = grps[1]+'.'+grps[2]+'.'+grps[3]+'.'+grps[4];

   //no mask
   if(typeof grps[5] === 'undefined' || grps[5].length<1){
   }
   //with mask
   else{
    mask = grps[5];
   }

   if(isIp4InCidrs(ip, invalid_ranges)){
     return false;
   }
   
   return true;
}

function ACLIPisValid(entry)
{
  if(entry.indexOf("_")>=0){
    return true;
  }
   var grps = parseCIDR(entry);
   if(!grps) return false;

   var mask = 32;
   var ip = grps[1]+'.'+grps[2]+'.'+grps[3]+'.'+grps[4];

   //no mask
   if(typeof grps[5] === 'undefined' || grps[5].length<1){
   }
   //with mask
   else{
    mask = grps[5];
   }

   if(isIp4InCidrs(ip, invalid_ranges)){
     return false;
   }
   
   return true;
}