/**
 * 构建后修复 dist/project.config.json
 * 使「打开 miniprogram/dist/」时也能正确找到云函数（../cloud/functions/）
 * 标准用法仍是打开 miniprogram/，此脚本仅为兼容
 */
const fs = require('fs');
const path = require('path');

const distConfigPath = path.join(__dirname, '../dist/project.config.json');
if (!fs.existsSync(distConfigPath)) return;

const config = JSON.parse(fs.readFileSync(distConfigPath, 'utf8'));
config.cloudfunctionRoot = '../cloud/functions/';
fs.writeFileSync(distConfigPath, JSON.stringify(config, null, 2) + '\n');
