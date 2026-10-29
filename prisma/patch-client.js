const fs = require('fs');
const path = require('path');

console.log('--- Patching Prisma Client files directly ---');

// 1. Copy schema.prisma
const rootSchemaPath = path.join(__dirname, 'schema.prisma');
const clientSchemaPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'schema.prisma');
const schemaContent = fs.readFileSync(rootSchemaPath, 'utf8');
fs.writeFileSync(clientSchemaPath, schemaContent, 'utf8');
console.log('Copied schema.prisma to .prisma/client');

// 2. Patch index.js
const indexPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'index.js');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Patch DiseaseScalarFieldEnum
const oldEnum = `exports.Prisma.DiseaseScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  urgency: 'urgency',
  notifiable: 'notifiable',
  firstAid: 'firstAid'
};`;

const newEnum = `exports.Prisma.DiseaseScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  nameSw: 'nameSw',
  urgency: 'urgency',
  notifiable: 'notifiable',
  firstAid: 'firstAid',
  firstAidSw: 'firstAidSw',
  fallbackAdvice: 'fallbackAdvice',
  fallbackAdviceSw: 'fallbackAdviceSw',
  reviewed: 'reviewed',
  reviewedBy: 'reviewedBy',
  firstAidVersion: 'firstAidVersion'
};`;

if (indexContent.includes(oldEnum)) {
  indexContent = indexContent.replace(oldEnum, newEnum);
  console.log('Patched DiseaseScalarFieldEnum in index.js');
} else {
  console.log('DiseaseScalarFieldEnum already patched or not found as exact string');
}

// Patch inlineSchema
const schemaJsonStr = JSON.stringify(schemaContent);
const inlineSchemaRegex = /"inlineSchema":\s*".*?"(?=,\s*"inlineSchemaHash")/s;
// Let's find "inlineSchema": "
const inlineSchemaStart = indexContent.indexOf('"inlineSchema": "');
if (inlineSchemaStart !== -1) {
  const hashStart = indexContent.indexOf('"inlineSchemaHash":', inlineSchemaStart);
  if (hashStart !== -1) {
    const endQuote = indexContent.lastIndexOf('"', hashStart - 1);
    // Replace the string
    indexContent = indexContent.slice(0, inlineSchemaStart + '"inlineSchema": '.length) + schemaJsonStr + indexContent.slice(endQuote + 1);
    console.log('Patched inlineSchema in index.js');
  }
}

const rdmPrefix = 'config.runtimeDataModel = JSON.parse("';
const rdmIdx = indexContent.indexOf(rdmPrefix);
if (rdmIdx !== -1) {
  const jsonStart = rdmIdx + rdmPrefix.length;
  const jsonEnd = indexContent.indexOf('")', jsonStart);
  const rawEscapedJson = indexContent.substring(jsonStart, jsonEnd);
  const unescapedJson = rawEscapedJson.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const dmmf = JSON.parse(unescapedJson);

  const existingFieldNames = new Set(dmmf.models.Disease.fields.map((f) => f.name));

  const newFields = [
    {
      name: 'nameSw',
      kind: 'scalar',
      isList: false,
      isRequired: false,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'String',
      nativeType: ['VarChar', ['255']],
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'firstAidSw',
      kind: 'scalar',
      isList: false,
      isRequired: false,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'String',
      nativeType: ['Text', []],
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'fallbackAdvice',
      kind: 'scalar',
      isList: false,
      isRequired: false,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'String',
      nativeType: ['Text', []],
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'fallbackAdviceSw',
      kind: 'scalar',
      isList: false,
      isRequired: false,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'String',
      nativeType: ['Text', []],
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'reviewed',
      kind: 'scalar',
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: true,
      type: 'Boolean',
      nativeType: null,
      default: false,
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'reviewedBy',
      kind: 'scalar',
      isList: false,
      isRequired: false,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: false,
      type: 'String',
      nativeType: ['VarChar', ['255']],
      isGenerated: false,
      isUpdatedAt: false,
    },
    {
      name: 'firstAidVersion',
      kind: 'scalar',
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: false,
      isReadOnly: false,
      hasDefaultValue: true,
      type: 'Int',
      nativeType: null,
      default: 1,
      isGenerated: false,
      isUpdatedAt: false,
    },
  ];

  for (const nf of newFields) {
    if (!existingFieldNames.has(nf.name)) {
      dmmf.models.Disease.fields.push(nf);
    }
  }

  const updatedJsonStr = JSON.stringify(dmmf);
  const reescaped = updatedJsonStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  indexContent = indexContent.substring(0, jsonStart) + reescaped + indexContent.substring(jsonEnd);
  console.log('Patched runtimeDataModel in index.js');
}

fs.writeFileSync(indexPath, indexContent, 'utf8');

// 3. Patch index.d.ts
const dtsPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'index.d.ts');
let dtsContent = fs.readFileSync(dtsPath, 'utf8');

// Add fields to export type Disease
const oldTypeDisease = `export type Disease = $Result.DefaultSelection<$Prisma.$DiseasePayload>
  export type AggregateDisease = {
    _count: DiseaseCountAggregateOutputType | null
    _avg: DiseaseAvgAggregateOutputType | null
    _sum: DiseaseSumAggregateOutputType | null
    _min: DiseaseMinAggregateOutputType | null
    _max: DiseaseMaxAggregateOutputType | null
  }`;

// Find $DiseasePayload definition
const diseasePayloadIdx = dtsContent.indexOf('$DiseasePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {');
if (diseasePayloadIdx !== -1) {
  const scalarsIdx = dtsContent.indexOf('scalars: $Extensions.GetPayloadResult<{', diseasePayloadIdx);
  if (scalarsIdx !== -1) {
    const insertPoint = dtsContent.indexOf('firstAid: string | null', scalarsIdx);
    if (insertPoint !== -1 && !dtsContent.includes('nameSw: string | null')) {
      const extraFields = `
      nameSw: string | null
      firstAidSw: string | null
      fallbackAdvice: string | null
      fallbackAdviceSw: string | null
      reviewed: boolean
      reviewedBy: string | null
      firstAidVersion: number`;
      dtsContent = dtsContent.slice(0, insertPoint) + 'firstAid: string | null' + extraFields + dtsContent.slice(insertPoint + 'firstAid: string | null'.length);
      console.log('Patched $DiseasePayload scalars in index.d.ts');
    }
  }
}

// Also check DiseaseCreateInput and DiseaseUpdateInput
const patchInput = (typeName) => {
  const target = `export type ${typeName} = {`;
  const idx = dtsContent.indexOf(target);
  if (idx !== -1 && !dtsContent.includes(`${typeName} = {\n    nameSw?:`)) {
    const firstAidIdx = dtsContent.indexOf('firstAid?:', idx);
    if (firstAidIdx !== -1 && firstAidIdx < idx + 500) {
      const endOfLine = dtsContent.indexOf('\n', firstAidIdx);
      const extraFields = `\n    nameSw?: string | null\n    firstAidSw?: string | null\n    fallbackAdvice?: string | null\n    fallbackAdviceSw?: string | null\n    reviewed?: boolean\n    reviewedBy?: string | null\n    firstAidVersion?: number`;
      dtsContent = dtsContent.slice(0, endOfLine) + extraFields + dtsContent.slice(endOfLine);
      console.log(`Patched ${typeName} in index.d.ts`);
    }
  }
};

['DiseaseCreateInput', 'DiseaseUncheckedCreateInput', 'DiseaseUpdateInput', 'DiseaseUncheckedUpdateInput'].forEach(patchInput);

fs.writeFileSync(dtsPath, dtsContent, 'utf8');

console.log('--- Prisma Client Successfully Patched ---');
