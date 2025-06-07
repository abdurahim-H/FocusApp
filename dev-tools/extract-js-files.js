// filepath: /workspaces/website/dev-tools/extract-js-files.js
const fs = require('fs');
const path = require('path');

/**
 * JavaScript Files Extractor Utility
 * 
 * Purpose: Extracts all JS files from the js folder and writes them to five text files
 * This is useful for code review, documentation, and external analysis.
 * 
 * Usage:
 *   node dev-tools/extract-js-files.js
 * 
 * Output:
 *   - js-files-output-part1.txt (files 1-3)
 *   - js-files-output-part2.txt (files 4-6) 
 *   - js-files-output-part3.txt (files 7-9)
 *   - js-files-output-part4.txt (files 10-12)
 *   - js-files-output-part5.txt (files 13+)
 * 
 * Note: Splits files into five parts for better file management
 */
function extractJSFiles() {
    const jsFolder = path.join(__dirname, '..', 'js'); // Updated path since we moved the file
    const outputFile1 = path.join(__dirname, '..', 'js-files-output-part1.txt');
    const outputFile2 = path.join(__dirname, '..', 'js-files-output-part2.txt');
    const outputFile3 = path.join(__dirname, '..', 'js-files-output-part3.txt');
    const outputFile4 = path.join(__dirname, '..', 'js-files-output-part4.txt');
    const outputFile5 = path.join(__dirname, '..', 'js-files-output-part5.txt');
    
    try {
        // Check if js folder exists
        if (!fs.existsSync(jsFolder)) {
            console.error('JS folder not found at:', jsFolder);
            return;
        }
        
        // Read all files in the js directory
        const files = fs.readdirSync(jsFolder);
        const jsFiles = files.filter(file => file.endsWith('.js'));
        
        if (jsFiles.length === 0) {
            console.log('No JS files found in the js folder');
            return;
        }
        
        // Split files into five parts for better file management
        const filesPerPart = Math.ceil(jsFiles.length / 5);
        const part1 = jsFiles.slice(0, 3);
        const part2 = jsFiles.slice(3, 6);
        const part3 = jsFiles.slice(6, 9);
        const part4 = jsFiles.slice(9, 12);
        const part5 = jsFiles.slice(12);
        
        console.log(`📊 Total JS files: ${jsFiles.length}`);
        console.log(`📁 Part 1 will contain: ${part1.length} files`);
        console.log(`📁 Part 2 will contain: ${part2.length} files`);
        console.log(`📁 Part 3 will contain: ${part3.length} files`);
        console.log(`📁 Part 4 will contain: ${part4.length} files`);
        console.log(`📁 Part 5 will contain: ${part5.length} files`);
        
        // Process part 1
        let output1 = createHeader('Part 1', part1.length, jsFiles.length);
        output1 += `Files in this part: ${part1.join(', ')}\n`;
        output1 += `${'='.repeat(80)}\n\n`;
        
        part1.forEach((filename, index) => {
            output1 += processJSFile(jsFolder, filename, index + 1);
        });
        
        // Process part 2
        let output2 = createHeader('Part 2', part2.length, jsFiles.length);
        output2 += `Files in this part: ${part2.join(', ')}\n`;
        output2 += `${'='.repeat(80)}\n\n`;
        
        part2.forEach((filename, index) => {
            output2 += processJSFile(jsFolder, filename, index + 1 + part1.length);
        });
        
        // Process part 3
        let output3 = createHeader('Part 3', part3.length, jsFiles.length);
        output3 += `Files in this part: ${part3.join(', ')}\n`;
        output3 += `${'='.repeat(80)}\n\n`;
        
        part3.forEach((filename, index) => {
            output3 += processJSFile(jsFolder, filename, index + 1 + part1.length + part2.length);
        });
        
        // Process part 4
        let output4 = createHeader('Part 4', part4.length, jsFiles.length);
        output4 += `Files in this part: ${part4.join(', ')}\n`;
        output4 += `${'='.repeat(80)}\n\n`;
        
        part4.forEach((filename, index) => {
            output4 += processJSFile(jsFolder, filename, index + 1 + part1.length + part2.length + part3.length);
        });
        
        // Process part 5
        let output5 = createHeader('Part 5', part5.length, jsFiles.length);
        output5 += `Files in this part: ${part5.join(', ')}\n`;
        output5 += `${'='.repeat(80)}\n\n`;
        
        part5.forEach((filename, index) => {
            output5 += processJSFile(jsFolder, filename, index + 1 + part1.length + part2.length + part3.length + part4.length);
        });
        
        // Write to output files
        fs.writeFileSync(outputFile1, output1, 'utf8');
        fs.writeFileSync(outputFile2, output2, 'utf8');
        fs.writeFileSync(outputFile3, output3, 'utf8');
        fs.writeFileSync(outputFile4, output4, 'utf8');
        fs.writeFileSync(outputFile5, output5, 'utf8');
        
        console.log(`\n🎉 Successfully extracted ${jsFiles.length} JS files`);
        console.log(`📄 Part 1 written to: ${outputFile1}`);
        console.log(`📊 Part 1 size: ${output1.length} characters`);
        console.log(`📄 Part 2 written to: ${outputFile2}`);
        console.log(`📊 Part 2 size: ${output2.length} characters`);
        console.log(`📄 Part 3 written to: ${outputFile3}`);
        console.log(`📊 Part 3 size: ${output3.length} characters`);
        console.log(`📄 Part 4 written to: ${outputFile4}`);
        console.log(`📊 Part 4 size: ${output4.length} characters`);
        console.log(`📄 Part 5 written to: ${outputFile5}`);
        console.log(`📊 Part 5 size: ${output5.length} characters`);
        
    } catch (error) {
        console.error('❌ Error during extraction:', error.message);
    }
}

/**
 * Creates header for output file
 */
function createHeader(partName, partCount, totalCount) {
    let header = `JS Files Content Export - ${partName}\n`;
    header += `Generated on: ${new Date().toISOString()}\n`;
    header += `Files in this part: ${partCount}/${totalCount}\n`;
    return header;
}

/**
 * Processes a single JS file and returns formatted content
 */
function processJSFile(jsFolder, filename, fileNumber) {
    const filePath = path.join(jsFolder, filename);
    let output = '';
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        output += `File ${fileNumber}: ${filename}\n`;
        output += `Path: js/${filename}\n`;
        output += `Size: ${content.length} characters\n`;
        output += `Lines: ${content.split('\n').length}\n`;
        output += `${'-'.repeat(60)}\n`;
        output += content;
        output += `\n\n${'='.repeat(80)}\n\n`;
        
        console.log(`✅ Processed: ${filename} (${content.length} chars)`);
    } catch (error) {
        console.error(`❌ Error reading ${filename}:`, error.message);
        output += `File ${fileNumber}: ${filename}\n`;
        output += `ERROR: Could not read file - ${error.message}\n`;
        output += `${'-'.repeat(60)}\n\n`;
    }
    
    return output;
}

// Run the extraction
console.log('🚀 Starting JS file extraction...');
extractJSFiles();