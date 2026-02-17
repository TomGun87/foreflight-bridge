#!/usr/bin/env node
/**
 * Downloads and processes the OurAirports database into a compact JSON file.
 * Run with: node fetch-airports.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUTPUT_FILE = path.join(__dirname, 'airports.json');

function downloadCSV(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const airports = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Parse CSV properly handling quoted fields
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const row = {};
        headers.forEach((h, idx) => row[h] = values[idx] || '');
        
        // Filter: only include airports with ICAO codes and reasonable types
        const validTypes = ['large_airport', 'medium_airport', 'small_airport'];
        if (row.ident && row.latitude_deg && row.longitude_deg && validTypes.includes(row.type)) {
            airports.push({
                icao: row.ident,
                iata: row.iata_code || '',
                name: row.name,
                city: row.municipality || '',
                country: row.iso_country,
                lat: parseFloat(row.latitude_deg),
                lon: parseFloat(row.longitude_deg),
                elev: parseInt(row.elevation_ft) || 0,
                type: row.type
            });
        }
    }
    
    return airports;
}

async function main() {
    console.log('📥 Downloading airport database from OurAirports...');
    
    try {
        const csv = await downloadCSV(AIRPORTS_URL);
        console.log('📊 Parsing CSV data...');
        
        const airports = parseCSV(csv);
        
        // Sort by type (large first) then by name
        const typeOrder = { 'large_airport': 0, 'medium_airport': 1, 'small_airport': 2 };
        airports.sort((a, b) => {
            const typeCompare = typeOrder[a.type] - typeOrder[b.type];
            if (typeCompare !== 0) return typeCompare;
            return a.name.localeCompare(b.name);
        });
        
        console.log(`✅ Found ${airports.length} airports`);
        
        // Write to JSON file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(airports));
        
        const stats = fs.statSync(OUTPUT_FILE);
        console.log(`💾 Saved to airports.json (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Summary
        const large = airports.filter(a => a.type === 'large_airport').length;
        const medium = airports.filter(a => a.type === 'medium_airport').length;
        const small = airports.filter(a => a.type === 'small_airport').length;
        console.log(`   Large: ${large}, Medium: ${medium}, Small: ${small}`);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

main();
