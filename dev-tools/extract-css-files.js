const fs = require('fs');
const path = require('path');

console.log('🚀 Starting CSS file extraction...');

const cssFolder = path.join(__dirname, '..', 'css');
const outputFile1 = path.join(__dirname, '..', 'css-files-output-part1.txt');
const outputFile2 = path.join(__dirname, '..', 'css-files-output-part2.txt');

console.log('CSS folder path:', cssFolder);
console.log('Output file 1 path:', outputFile1);
console.log('Output file 2 path:', outputFile2);

try {
    // Check if css folder exists
    if (!fs.existsSync(cssFolder)) {
        console.error('CSS folder not found at:', cssFolder);
        process.exit(1);
    }
    
    // Read all files in the css directory
    const files = fs.readdirSync(cssFolder);
    const cssFiles = files.filter(file => file.endsWith('.css'));
    
    console.log('Found files:', files);
    console.log('CSS files:', cssFiles);
    
    if (cssFiles.length === 0) {
        console.log('No CSS files found in the css folder');
        process.exit(1);
    }
    
    console.log(`📊 Total CSS files: ${cssFiles.length}`);
    console.log(`📁 Files to process: ${cssFiles.join(', ')}`);
    
    // Split files into two parts for better file management
    const part1 = cssFiles.slice(0, 3);
    const part2 = cssFiles.slice(3);
    
    console.log(`📁 Part 1 will contain: ${part1.length} files`);
    console.log(`📁 Part 2 will contain: ${part2.length} files`);
    
    // Process part 1
    let output1 = `CSS Files Content Export - Part 1\n`;
    output1 += `Generated on: ${new Date().toISOString()}\n`;
    output1 += `Files in this part: ${part1.length}/${cssFiles.length}\n`;
    output1 += `Source: css/ folder\n`;
    output1 += `Files in this part: ${part1.join(', ')}\n`;
    output1 += `${'='.repeat(80)}\n\n`;
    
    part1.forEach((filename, index) => {
        console.log(`Processing ${filename}...`);
        const filePath = path.join(cssFolder, filename);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            output1 += `File ${index + 1}: ${filename}\n`;
            output1 += `Path: css/${filename}\n`;
            output1 += `Size: ${content.length} characters\n`;
            output1 += `Lines: ${content.split('\n').length}\n`;
            output1 += `${'-'.repeat(60)}\n`;
            output1 += content;
            output1 += `\n\n${'='.repeat(80)}\n\n`;
            
            console.log(`✅ Processed: ${filename} (${content.length} chars)`);
        } catch (error) {
            console.error(`❌ Error reading ${filename}:`, error.message);
            output1 += `File ${index + 1}: ${filename}\n`;
            output1 += `ERROR: Could not read file - ${error.message}\n`;
            output1 += `${'-'.repeat(60)}\n\n`;
        }
    });
    
    // Process part 2
    let output2 = `CSS Files Content Export - Part 2\n`;
    output2 += `Generated on: ${new Date().toISOString()}\n`;
    output2 += `Files in this part: ${part2.length}/${cssFiles.length}\n`;
    output2 += `Source: css/ folder\n`;
    output2 += `Files in this part: ${part2.join(', ')}\n`;
    output2 += `${'='.repeat(80)}\n\n`;
    
    part2.forEach((filename, index) => {
        console.log(`Processing ${filename}...`);
        const filePath = path.join(cssFolder, filename);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            output2 += `File ${index + 1 + part1.length}: ${filename}\n`;
            output2 += `Path: css/${filename}\n`;
            output2 += `Size: ${content.length} characters\n`;
            output2 += `Lines: ${content.split('\n').length}\n`;
            output2 += `${'-'.repeat(60)}\n`;
            output2 += content;
            output2 += `\n\n${'='.repeat(80)}\n\n`;
            
            console.log(`✅ Processed: ${filename} (${content.length} chars)`);
        } catch (error) {
            console.error(`❌ Error reading ${filename}:`, error.message);
            output2 += `File ${index + 1 + part1.length}: ${filename}\n`;
            output2 += `ERROR: Could not read file - ${error.message}\n`;
            output2 += `${'-'.repeat(60)}\n\n`;
        }
    });
    
    // Write to output files
    console.log('Writing output files...');
    fs.writeFileSync(outputFile1, output1, 'utf8');
    fs.writeFileSync(outputFile2, output2, 'utf8');
    console.log('Output files written successfully');
    
    console.log(`\n🎉 Successfully extracted ${cssFiles.length} CSS files`);
    console.log(`📄 Part 1 written to: ${outputFile1}`);
    console.log(`📊 Part 1 size: ${output1.length} characters`);
    console.log(`📄 Part 2 written to: ${outputFile2}`);
    console.log(`📊 Part 2 size: ${output2.length} characters`);
    
} catch (error) {
    console.error('❌ Error during extraction:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
