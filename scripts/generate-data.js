/**
 * generate-data.js
 * Generates 100 SYNTHETIC sample records that match the structure of:
 *   - Client_dealer_mapping.xlsx  (Sheet1)
 *   - TPIN.xlsx                  (Sheet1)
 *
 * All names, numbers, and IDs below are randomly generated fakes.
 * Nothing here is real customer data.
 */

const fs = require('fs');
const path = require('path');

const firstNames = [
  'Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan',
  'Rohan','Kabir','Aryan','Dhruv','Karan','Nikhil','Rahul','Siddharth','Varun','Yash',
  'Ananya','Diya','Ira','Myra','Aadhya','Saanvi','Kavya','Riya','Priya','Isha',
  'Neha','Pooja','Sneha','Meera','Anjali','Divya','Sonal','Ritika','Shreya','Tanya',
  'Manoj','Suresh','Ramesh','Ganesh','Vijay','Ajay','Sanjay','Deepak','Rakesh','Naveen'
];
const lastNames = [
  'Sharma','Verma','Gupta','Mehta','Shah','Patel','Iyer','Nair','Menon','Reddy',
  'Rao','Naidu','Chopra','Malhotra','Kapoor','Bhatia','Khanna','Joshi','Deshpande','Kulkarni',
  'Agarwal','Bansal','Chawla','Dutta','Ghosh','Mukherjee','Banerjee','Sinha','Pandey','Tiwari'
];
const branches = [
  ['BR_0001','Andheri West'], ['BR_0014','Bandra Kurla Complex'], ['BR_0026','Ghansoli'],
  ['BR_0033','Powai'], ['BR_0045','Thane West'], ['BR_0052','Vashi'],
  ['BR_0061','Connaught Place'], ['BR_0070','Gurgaon Sector 29'], ['BR_0084','Noida Sector 18'],
  ['BR_0091','Whitefield Bangalore'], ['BR_0102','Koramangala'], ['BR_0115','Salt Lake Kolkata']
];
const businessNames = ['Trading','Broking','Wealth Management','Retail Investing','Institutional','Derivatives'];
const dealerFirstNames = ['Ram','Suresh','Anil','Vikas','Sunil','Ashok','Mahesh','Ravi','Sanjeev','Prakash'];
const dealerLastNames = ['Prakash','Kumar','Singh','Yadav','Choudhary','Mishra','Tiwari','Pandey','Saxena','Bhatt'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(num, size) { return num.toString().padStart(size, '0'); }
function randomMobile() {
  const prefixes = ['91','92','93','94','95','96','97','98','99'];
  return '+91' + pick(prefixes) + Math.floor(10000000 + Math.random() * 89999999).toString();
}
function randomLandline() {
  return '+9122' + Math.floor(10000000 + Math.random() * 89999999).toString();
}
function randomDOB() {
  const year = 1960 + Math.floor(Math.random() * 45); // 1960-2004
  const month = pad(1 + Math.floor(Math.random() * 12), 2);
  const day = pad(1 + Math.floor(Math.random() * 28), 2);
  return `${year}-${month}-${day}`;
}
function yesNo(probYes = 0.5) { return Math.random() < probYes ? 'Yes' : 'No'; }
function randomTpin() { return Math.floor(1000 + Math.random() * 9000).toString(); }

const clients = [];
const tpins = [];

for (let i = 0; i < 100; i++) {
  const entityId = 15000000 + Math.floor(Math.random() * 5000000);
  const fName = pick(firstNames);
  const lName = pick(lastNames);
  const entityName = `${fName} ${lName}`;
  const mobile1 = randomMobile();
  const hasSecondMobile = Math.random() < 0.35;
  const mobile2 = hasSecondMobile ? randomMobile() : '';
  const arMobile = mobile1; // Authorized representative usually same as primary in this sample data
  const c1 = randomLandline();
  const c2 = Math.random() < 0.2 ? randomLandline() : '';
  const dealerId = pad(400000 + Math.floor(Math.random() * 90000), 6);
  const dealerName = `${pick(dealerFirstNames)} ${pick(dealerLastNames)}`;
  const dealerEmail = `${dealerName.toLowerCase().replace(' ', '.')}@axis.com`;
  const [branchId, branchName] = pick(branches);
  const businessName = pick(businessNames);
  const regionId = `R_${pad(1 + Math.floor(Math.random() * 20), 4)}`;
  const bmId = `BM_${pad(1000 + Math.floor(Math.random() * 9000), 4)}`;
  const rmId = `RM_${pad(1000 + Math.floor(Math.random() * 9000), 4)}`;
  const zmId = `ZM_${pad(10000 + Math.floor(Math.random() * 90000), 5)}`;
  const bizMId = `BIZ_M_ID_${pad(1000000 + Math.floor(Math.random() * 9000000), 7)}`;
  const csUgc = yesNo(0.15);
  const csPbrg = yesNo(0.2);
  const csBrg = yesNo(0.3);
  const gc = yesNo(0.4);
  const criticalCustomer = yesNo(0.1);
  const axisEmp = yesNo(0.05);
  const extPrimary = Math.random() < 0.6 ? (1000 + Math.floor(Math.random() * 100)).toString() : '';
  const extSecondary = Math.random() < 0.3 ? (1000 + Math.floor(Math.random() * 100)).toString() : '';

  clients.push({
    ENTITY_ID: entityId,
    ENTITY_NAME: entityName,
    ENT_MOBILE_NO: mobile1,
    ENT_MOBILE_NO_2: mobile2,
    AR_MOBILE_NUMBER: arMobile,
    'C1 Number': c1,
    'C2 Number': c2,
    DEALER_ID: dealerId,
    DEALER_NAME: dealerName,
    DEALER_EMAIL_ID: dealerEmail,
    BRANCH_ID: branchId,
    BRANCH_NAME: branchName,
    BUSINESS_NAME: businessName,
    REGION_ID: regionId,
    BM_ID: bmId,
    RM_ID: rmId,
    ZM_ID: zmId,
    BIZ_M_ID: bizMId,
    DOB: randomDOB(),
    CS_UGC: csUgc,
    CS_PBRG: csPbrg,
    CS_BRG: csBrg,
    gc: gc,
    critical_customer: criticalCustomer,
    axis_emp: axisEmp,
    'Extension of Primary RM': extPrimary,
    'Extension of Secondary RM': extSecondary
  });

  // ANI format in TPIN sheet has no '+' prefix, e.g. 919167371528
  const ani = mobile1.replace('+', '');
  tpins.push({
    Customer_ANI: ani,
    TPIN: randomTpin()
  });
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

fs.writeFileSync(path.join(dataDir, 'clients.json'), JSON.stringify(clients, null, 2));
fs.writeFileSync(path.join(dataDir, 'tpins.json'), JSON.stringify(tpins, null, 2));

console.log(`Generated ${clients.length} client records -> data/clients.json`);
console.log(`Generated ${tpins.length} TPIN records -> data/tpins.json`);
