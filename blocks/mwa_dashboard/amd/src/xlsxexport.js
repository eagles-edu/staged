// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Small native XLSX writer used by dashboard exports.
 *
 * @module block_mwa_dashboard/xlsxexport
 * @copyright 2026 Bruno Porto
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define([], function() {
    'use strict';

    function xml(value) {
        return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }
    function colName(index) {
        var name = '';
        index++;
        while (index > 0) {
            index--;
            name = String.fromCharCode(65 + index % 26) + name;
            index = Math.floor(index / 26);
        }
        return name;
    }
    function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]; }
    function u16(n) { return [n & 255, (n >> 8) & 255]; }
    function crc32(bytes) {
        var table = [];
        for (var i = 0; i < 256; i++) {
            var c = i;
            for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[i] = c;
        }
        var crc = 0xFFFFFFFF;
        for (var k = 0; k < bytes.length; k++) crc = table[(crc ^ bytes[k]) & 255] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function download(headers, rows, filename, sheetName) {
        var allRows = [headers].concat(rows);
        var strings = [], stringMap = Object.create(null);
        function stringIndex(value) {
            var key = String(value == null ? '' : value);
            if (stringMap[key] === undefined) { stringMap[key] = strings.length; strings.push(key); }
            return stringMap[key];
        }
        var sheetRows = allRows.map(function(row, rowIndex) {
            var cells = row.map(function(value, columnIndex) {
                var ref = colName(columnIndex) + (rowIndex + 1);
                if (typeof value === 'number' && isFinite(value)) return '<c r="' + ref + '" t="n"><v>' + value + '</v></c>';
                return '<c r="' + ref + '" t="s"><v>' + stringIndex(value) + '</v></c>';
            }).join('');
            return '<row r="' + (rowIndex + 1) + '">' + cells + '</row>';
        }).join('');
        var cols = headers.map(function(_, index) {
            var width = allRows.reduce(function(max, row) {
                return Math.max(max, String(row[index] == null ? '' : row[index]).length + 2);
            }, 10);
            return '<col min="' + (index + 1) + '" max="' + (index + 1) + '" width="' + Math.min(width, 42) + '" customWidth="1"/>';
        }).join('');
        var range = 'A1:' + colName(headers.length - 1) + allRows.length;
        var sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            + '<dimension ref="' + range + '"/><sheetViews><sheetView workbookViewId="0">'
            + '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
            + '</sheetView></sheetViews><cols>' + cols + '</cols><sheetData>' + sheetRows + '</sheetData>'
            + '<autoFilter ref="' + range + '"/></worksheet>';
        var shared = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="'
            + strings.length + '" uniqueCount="' + strings.length + '">' + strings.map(function(value) {
                return '<si><t xml:space="preserve">' + xml(value) + '</t></si>';
            }).join('') + '</sst>';
        var safeSheetName = String(sheetName || 'Dados').replace(/[\\/*?:\[\]]/g, ' ').slice(0, 31);
        var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'
            + xml(safeSheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>';
        var workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>';
        var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
        var types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>';
        var files = [
            {name: '[Content_Types].xml', data: types}, {name: '_rels/.rels', data: rootRels},
            {name: 'xl/workbook.xml', data: workbook}, {name: 'xl/_rels/workbook.xml.rels', data: workbookRels},
            {name: 'xl/worksheets/sheet1.xml', data: sheet}, {name: 'xl/sharedStrings.xml', data: shared}
        ];
        var encoder = new TextEncoder(), local = [], central = [], offset = 0;
        files.forEach(function(file) {
            var name = encoder.encode(file.name), data = encoder.encode(file.data), crc = crc32(data), size = data.length;
            var header = [80,75,3,4,20,0,0,0,0,0].concat(u16(0), u16(0x5421), u32(crc), u32(size), u32(size), u16(name.length), u16(0));
            var entry = header.concat(Array.from(name), Array.from(data));
            local.push(entry);
            central.push([80,75,1,2,20,0,20,0,0,0,0,0].concat(u16(0), u16(0x5421), u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), Array.from(name)));
            offset += entry.length;
        });
        var directory = central.reduce(function(out, item) { return out.concat(item); }, []);
        var end = [80,75,5,6,0,0,0,0].concat(u16(files.length), u16(files.length), u32(directory.length), u32(offset), u16(0));
        var bytes = local.reduce(function(out, item) { return out.concat(item); }, []).concat(directory, end);
        var url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
    }

    return {download: download};
});
