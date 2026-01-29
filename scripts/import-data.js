/**
 * NC Groups Data Import Script
 * 
 * This script imports people and group data from the NC involvement CSV.
 * Run once after initial deployment: npm run import
 * 
 * Handles:
 * - Name splitting (first/last)
 * - "Jessie and Brett Lafollette" → two separate people
 * - Phone number cleaning (removes commas, non-digits)
 * - Gender mapping (f → Female, m → Male)
 * - Age group mapping (M → Adult, Y → Youth, C → Child, YP → Adult + Youth Parents group)
 * - Opt-out detection
 * - Group memberships from boolean columns
 */

import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// All group columns in order from the CSV header
const GROUP_COLUMNS = [
  'Staff/Elder',
  'Dave D-Group',
  'Joel D-Group',
  'Curtis D-Group',
  'Rob D-Group',
  'Rivers D-Group',
  'Lori D-Group',
  'Elaine D-Group',
  'Maria D-Group',
  'Purviance Group',
  'NeighGrp Vonder',
  'Young Adults',
  'JOY Club',
  'Youth Ministry',
  'Kids Ministry',
  'Hospitality',
  'Greeting',
  'Band',
  'Tech',
  'Prayer',
  'Care & Meals',
  'Sports Camp',
  'Cleaning',
  'Grounds Crew',
  'Building & Maint',
  'Preaching Team',
  'Finance/Counting',
  'Send Relief Trained',
  'Service Leader'
];

// Additional groups from the CSV that need to be created
const ADDITIONAL_GROUPS = [
  'ALL NCYG',        // All NC Youth Group kids - from column
  'Kids Min Parents', // Kids Ministry Parents - from column
  'Youth Parents'     // YP designation in age column
];

/**
 * Clean and validate phone number
 * Returns 10-digit string or null
 */
function cleanPhone(rawPhone) {
  if (!rawPhone) return null;
  
  // Remove all non-digit characters
  const digits = rawPhone.replace(/\D/g, '');
  
  // Handle common formats
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  
  // If we have something that looks like a phone number but wrong length, still try
  if (digits.length >= 10) {
    return digits.slice(0, 10);
  }
  
  return null;
}

/**
 * Parse name field and split into first/last
 * Handles "Jessie and Brett Lafollette" → [{first: "Jessie", last: "Lafollette"}, {first: "Brett", last: "Lafollette"}]
 */
function parseNames(nameField) {
  if (!nameField || !nameField.trim()) return [];
  
  const name = nameField.trim();
  
  // Check for "and" pattern (e.g., "Jessie and Brett Lafollette" or "Jessica and Brandon Porter")
  const andMatch = name.match(/^(\w+)\s+and\s+(\w+)\s+(.+)$/i);
  if (andMatch) {
    const [, firstName1, firstName2, lastName] = andMatch;
    return [
      { firstName: firstName1.trim(), lastName: lastName.trim() },
      { firstName: firstName2.trim(), lastName: lastName.trim() }
    ];
  }
  
  // Handle special case: tab in name like "Zoe\tGamble"
  const tabParts = name.split('\t').filter(p => p.trim());
  if (tabParts.length === 2) {
    return [{ firstName: tabParts[0].trim(), lastName: tabParts[1].trim() }];
  }
  
  // Standard "First Last" or "First Middle Last" pattern
  const parts = name.split(/\s+/);
  
  if (parts.length === 1) {
    // Single name - use as first name, empty last name
    return [{ firstName: parts[0], lastName: '' }];
  }
  
  if (parts.length === 2) {
    return [{ firstName: parts[0], lastName: parts[1] }];
  }
  
  // Three+ parts: First goes to firstName, rest to lastName
  // Handles names like "Mary Jane Kennedy" or "Kit von der Linden"
  return [{ firstName: parts[0], lastName: parts.slice(1).join(' ') }];
}

/**
 * Map CSV gender value to enum
 */
function mapGender(genderValue) {
  if (!genderValue) return null;
  const g = genderValue.toLowerCase().trim();
  if (g === 'f') return 'Female';
  if (g === 'm') return 'Male';
  return null;
}

/**
 * Map CSV age/membership value to age group
 * Returns { ageGroup, isYouthParent }
 */
function mapAgeGroup(value) {
  if (!value) return { ageGroup: null, isYouthParent: false };
  const v = value.toUpperCase().trim();
  
  if (v === 'M' || v === 'M?') return { ageGroup: 'Adult', isYouthParent: false };
  if (v === 'R') return { ageGroup: 'Adult', isYouthParent: false }; // Regular attender
  if (v === 'Y') return { ageGroup: 'Youth', isYouthParent: false };
  if (v === 'C') return { ageGroup: 'Child', isYouthParent: false };
  if (v === 'YP') return { ageGroup: 'Adult', isYouthParent: true }; // Youth Parent
  
  return { ageGroup: null, isYouthParent: false };
}

/**
 * Check if this row indicates an opted-out person
 */
function isOptedOut(nameField) {
  if (!nameField) return false;
  return nameField.toLowerCase().includes('opt out');
}

/**
 * Clean name of opt-out notation
 */
function cleanName(nameField) {
  if (!nameField) return nameField;
  // Remove "opt out" and any parenthetical content
  return nameField
    .replace(/\s*opt\s*out\s*/gi, '')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .trim();
}

async function importData() {
  console.log('🏛️  NC Groups Data Import');
  console.log('========================\n');
  
  // Read the CSV file
  const csvPath = process.argv[2] || path.join(__dirname, '../data/NC_People_Involvement_Fall_2025__MasterInvolvement.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    console.log('\nUsage: npm run import [path-to-csv]\n');
    process.exit(1);
  }
  
  console.log(`📄 Reading CSV from: ${csvPath}\n`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`📊 Found ${records.length} rows in CSV\n`);
  
  // Clear existing data (for fresh import)
  console.log('🗑️  Clearing existing data...');
  await prisma.personGroup.deleteMany();
  await prisma.person.deleteMany();
  await prisma.group.deleteMany();
  
  // Create all groups first
  console.log('📁 Creating groups...');
  const allGroupNames = [...GROUP_COLUMNS, ...ADDITIONAL_GROUPS];
  const groupMap = new Map(); // name -> id
  
  for (const groupName of allGroupNames) {
    const group = await prisma.group.create({
      data: { name: groupName }
    });
    groupMap.set(groupName, group.id);
  }
  console.log(`   Created ${allGroupNames.length} groups\n`);
  
  // Process people
  console.log('👥 Importing people...');
  let peopleCreated = 0;
  let membershipCreated = 0;
  let skippedEmpty = 0;
  let optedOutCount = 0;
  
  for (const record of records) {
    // Get the name field (first column is "RED OPT Out" which contains the name)
    const rawName = record['RED OPT Out'] || '';
    
    // Skip empty rows
    if (!rawName.trim()) {
      skippedEmpty++;
      continue;
    }
    
    // Check if opted out
    const optedOut = isOptedOut(rawName);
    if (optedOut) optedOutCount++;
    
    // Clean the name
    const cleanedName = cleanName(rawName);
    
    // Parse into individual people (handles "and" cases)
    const parsedNames = parseNames(cleanedName);
    
    if (parsedNames.length === 0) {
      skippedEmpty++;
      continue;
    }
    
    // Get other fields
    const rawPhone = record['Phone#'] || '';
    const phone = cleanPhone(rawPhone);
    const gender = mapGender(record['Gender'] || '');
    const { ageGroup, isYouthParent } = mapAgeGroup(record['Memb / RegAtten'] || '');
    
    // Determine group memberships from boolean columns
    const groupMemberships = [];
    
    for (const groupName of GROUP_COLUMNS) {
      const value = record[groupName];
      if (value && value.toUpperCase() === 'TRUE') {
        groupMemberships.push(groupName);
      }
    }
    
    // Check ALL NCYG column
    if (record['ALL NCYG'] && record['ALL NCYG'].toUpperCase() === 'TRUE') {
      groupMemberships.push('ALL NCYG');
    }
    
    // Check Kids Min Parents column
    if (record['Kids Min Parents'] && record['Kids Min Parents'].toUpperCase() === 'TRUE') {
      groupMemberships.push('Kids Min Parents');
    }
    
    // Add to Youth Parents if YP age group
    if (isYouthParent) {
      groupMemberships.push('Youth Parents');
    }
    
    // Create each person (handles couples like "Jessie and Brett")
    for (const { firstName, lastName } of parsedNames) {
      if (!firstName && !lastName) continue;
      
      try {
        const person = await prisma.person.create({
          data: {
            firstName: firstName || '',
            lastName: lastName || '',
            phone: phone,
            gender: gender,
            ageGroup: ageGroup,
            isOptedOut: optedOut
          }
        });
        
        peopleCreated++;
        
        // Create group memberships
        for (const groupName of groupMemberships) {
          const groupId = groupMap.get(groupName);
          if (groupId) {
            await prisma.personGroup.create({
              data: {
                personId: person.id,
                groupId: groupId
              }
            });
            membershipCreated++;
          }
        }
      } catch (error) {
        console.error(`   ⚠️  Error creating ${firstName} ${lastName}: ${error.message}`);
      }
    }
  }
  
  // Print summary
  console.log('\n✅ Import Complete!');
  console.log('==================');
  console.log(`   👥 People created: ${peopleCreated}`);
  console.log(`   📁 Groups created: ${allGroupNames.length}`);
  console.log(`   🔗 Group memberships: ${membershipCreated}`);
  console.log(`   🚫 Opted out: ${optedOutCount}`);
  console.log(`   ⏭️  Skipped (empty): ${skippedEmpty}`);
  
  // Show group stats
  console.log('\n📊 Group Membership Counts:');
  console.log('---------------------------');
  
  const groupCounts = await prisma.group.findMany({
    include: {
      _count: {
        select: { members: true }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  for (const group of groupCounts) {
    if (group._count.members > 0) {
      console.log(`   ${group.name}: ${group._count.members}`);
    }
  }
}

// Run the import
importData()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
