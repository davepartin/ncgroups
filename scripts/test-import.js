/**
 * NC Groups Data Import - DRY RUN TEST
 * 
 * This validates the CSV parsing logic without requiring a database connection.
 * Run: node scripts/test-import.js
 */

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// CONFIGURATION (same as import-data.js)
// ============================================================================

const GROUP_COLUMNS = [
  'Staff/Elder', 'Dave D-Group', 'Joel D-Group', 'Curtis D-Group', 'Rob D-Group',
  'Rivers D-Group', 'Lori D-Group', 'Elaine D-Group', 'Maria D-Group', 'Purviance Group',
  'NeighGrp Vonder', 'Young Adults', 'JOY Club', 'Youth Ministry', 'Kids Ministry',
  'Hospitality', 'Greeting', 'Band', 'Tech', 'Prayer', 'Care & Meals', 'Sports Camp',
  'Cleaning', 'Grounds Crew', 'Building & Maint', 'Preaching Team', 'Finance/Counting',
  'Send Relief Trained', 'Service Leader'
];

const COL = {
  NAME: 0, PHONE: 1, TOTAL_GROUPS: 2,
  GROUPS_START: 3, GROUPS_END: 31,
  GENDER: 35, MEMB_TYPE: 36, ALL_NCYG: 37, KIDS_MIN_PARENTS: 38
};

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

function parseNames(nameField) {
  if (!nameField || nameField.trim() === '') return [];
  
  const name = nameField.trim();
  const isOptedOut = name.toLowerCase().includes('opt out');
  let cleanName = name.replace(/\s*opt\s*out\s*/gi, '').replace(/\s*\([^)]*\)\s*/g, '').trim();
  
  // Handle "First and Second Last" pattern
  if (cleanName.toLowerCase().includes(' and ')) {
    const andMatch = cleanName.match(/^(\w+)\s+and\s+(\w+)\s+(.+)$/i);
    if (andMatch) {
      const [, first1, first2, lastName] = andMatch;
      return [
        { firstName: first1.trim(), lastName: lastName.trim(), isOptedOut },
        { firstName: first2.trim(), lastName: lastName.trim(), isOptedOut }
      ];
    }
  }

  // Handle tab-separated names
  if (cleanName.includes('\t')) {
    const parts = cleanName.split('\t').map(p => p.trim()).filter(p => p);
    if (parts.length >= 2) {
      return [{ firstName: parts[0], lastName: parts.slice(1).join(' '), isOptedOut }];
    }
  }

  const parts = cleanName.split(/\s+/);
  if (parts.length === 1) {
    return [{ firstName: parts[0], lastName: '', isOptedOut }];
  }
  
  return [{
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    isOptedOut
  }];
}

function cleanPhone(phoneField) {
  if (!phoneField) return null;
  const digits = phoneField.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}

function mapGender(genderField) {
  if (!genderField) return null;
  const g = genderField.toLowerCase().trim();
  if (g === 'f') return 'Lady';
  if (g === 'm') return 'Guy';
  return null;
}

function mapMembershipType(membType) {
  if (!membType) return { ageGroup: null, isYouthParent: false };
  const type = membType.toUpperCase().replace('?', '').trim();
  
  switch (type) {
    case 'M': case 'R': return { ageGroup: 'Adult', isYouthParent: false };
    case 'Y': return { ageGroup: 'Youth', isYouthParent: false };
    case 'C': return { ageGroup: 'Child', isYouthParent: false };
    case 'YP': return { ageGroup: 'Adult', isYouthParent: true };
    default: return { ageGroup: null, isYouthParent: false };
  }
}

function isTrueValue(value) {
  if (!value) return false;
  const v = value.toString().toUpperCase().trim();
  return v === 'TRUE' || v === '1' || v === 'YES';
}

// ============================================================================
// TEST RUNNER
// ============================================================================

async function testImport() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        NC Groups - Import DRY RUN TEST                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  const csvPath = resolve(__dirname, '../data/NC_People_Involvement_Fall_2025__MasterInvolvement.csv');
  console.log(`📄 Testing CSV: ${csvPath}\n`);
  
  const records = [];
  const people = [];
  const stats = {
    total: 0,
    withPhone: 0,
    optedOut: 0,
    adults: 0,
    youth: 0,
    children: 0,
    guys: 0,
    ladies: 0,
    youthParents: 0,
    groupMemberships: {}
  };
  
  // Initialize group stats
  [...GROUP_COLUMNS, 'ALL NCYG', 'Kids Min Parents', 'Youth Parents'].forEach(g => {
    stats.groupMemberships[g] = 0;
  });
  
  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(parse({ skip_empty_lines: true, relax_column_count: true, trim: true }))
      .on('data', (row) => records.push(row))
      .on('error', reject)
      .on('end', () => {
        const header = records[0];
        const dataRows = records.slice(1);
        
        console.log('📋 CSV Header Columns:');
        console.log(`   Total columns: ${header.length}`);
        console.log(`   Name column: "${header[COL.NAME]}"`);
        console.log(`   Phone column: "${header[COL.PHONE]}"`);
        console.log(`   Gender column: "${header[COL.GENDER]}"`);
        console.log(`   Memb Type column: "${header[COL.MEMB_TYPE]}"`);
        console.log(`   ALL NCYG column: "${header[COL.ALL_NCYG]}"`);
        console.log('');
        
        // Process each row
        for (const row of dataRows) {
          if (!row[COL.NAME] || row[COL.NAME].trim() === '') continue;
          
          const names = parseNames(row[COL.NAME]);
          
          for (const nameData of names) {
            if (!nameData.firstName && !nameData.lastName) continue;
            
            const phone = cleanPhone(row[COL.PHONE]);
            const gender = mapGender(row[COL.GENDER]);
            const { ageGroup, isYouthParent } = mapMembershipType(row[COL.MEMB_TYPE]);
            
            // Collect groups
            const groups = [];
            for (let j = 0; j < GROUP_COLUMNS.length; j++) {
              const colIndex = COL.GROUPS_START + j;
              if (isTrueValue(row[colIndex])) {
                groups.push(GROUP_COLUMNS[j]);
                stats.groupMemberships[GROUP_COLUMNS[j]]++;
              }
            }
            
            if (isTrueValue(row[COL.ALL_NCYG])) {
              groups.push('ALL NCYG');
              stats.groupMemberships['ALL NCYG']++;
            }
            
            if (isTrueValue(row[COL.KIDS_MIN_PARENTS])) {
              groups.push('Kids Min Parents');
              stats.groupMemberships['Kids Min Parents']++;
            }
            
            if (isYouthParent) {
              groups.push('Youth Parents');
              stats.groupMemberships['Youth Parents']++;
            }
            
            // Build person object
            const person = {
              firstName: nameData.firstName,
              lastName: nameData.lastName,
              phone,
              gender,
              ageGroup,
              isOptedOut: nameData.isOptedOut,
              groups
            };
            
            people.push(person);
            
            // Update stats
            stats.total++;
            if (phone) stats.withPhone++;
            if (nameData.isOptedOut) stats.optedOut++;
            if (ageGroup === 'Adult') stats.adults++;
            if (ageGroup === 'Youth') stats.youth++;
            if (ageGroup === 'Child') stats.children++;
            if (gender === 'Guy') stats.guys++;
            if (gender === 'Lady') stats.ladies++;
            if (isYouthParent) stats.youthParents++;
          }
        }
        
        // Output results
        console.log('👥 People Parsed:');
        console.log(`   Total: ${stats.total}`);
        console.log(`   With phone: ${stats.withPhone}`);
        console.log(`   Opted out: ${stats.optedOut}`);
        console.log('');
        
        console.log('📊 By Age Group:');
        console.log(`   Adults: ${stats.adults}`);
        console.log(`   Youth: ${stats.youth}`);
        console.log(`   Children: ${stats.children}`);
        console.log(`   Unknown: ${stats.total - stats.adults - stats.youth - stats.children}`);
        console.log('');
        
        console.log('👤 By Gender:');
        console.log(`   Guys: ${stats.guys}`);
        console.log(`   Ladies: ${stats.ladies}`);
        console.log(`   Unknown: ${stats.total - stats.guys - stats.ladies}`);
        console.log('');
        
        console.log('📁 Group Memberships:');
        Object.entries(stats.groupMemberships)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .forEach(([group, count]) => {
            console.log(`   ${group}: ${count}`);
          });
        console.log('');
        
        // Show some sample people
        console.log('🔍 Sample People (first 10):');
        people.slice(0, 10).forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.firstName} ${p.lastName} | ${p.phone || 'no phone'} | ${p.gender || '?'} | ${p.ageGroup || '?'} | ${p.groups.length} groups`);
        });
        console.log('');
        
        // Show special cases
        console.log('🎯 Special Cases:');
        
        // People with "and" in name (should be split)
        const splitPeople = people.filter(p => 
          dataRows.some(r => r[COL.NAME] && r[COL.NAME].toLowerCase().includes(' and ') && 
            (r[COL.NAME].includes(p.firstName) || r[COL.NAME].includes(p.lastName)))
        );
        console.log(`   Names with "and" (split into 2): ${splitPeople.length} people`);
        
        // Youth Parents
        const youthParents = people.filter(p => p.groups.includes('Youth Parents'));
        console.log(`   Youth Parents: ${youthParents.length}`);
        if (youthParents.length > 0) {
          console.log(`     Sample: ${youthParents.slice(0, 3).map(p => `${p.firstName} ${p.lastName}`).join(', ')}`);
        }
        
        // Opted out
        const optedOut = people.filter(p => p.isOptedOut);
        console.log(`   Opted out: ${optedOut.length}`);
        if (optedOut.length > 0) {
          console.log(`     Names: ${optedOut.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`);
        }
        
        console.log('\n✅ Dry run complete! Data looks good for import.');
        resolve({ people, stats });
      });
  });
}

testImport().catch(console.error);
