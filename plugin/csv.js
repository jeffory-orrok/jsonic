"use strict";
/* Copyright (c) 2013-2021 Richard Rodger, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Csv = void 0;
const jsonic_1 = require("../jsonic");
let Csv = function csv(jsonic) {
    let plugin_opts = jsonic.options.plugin.csv;
    let token = {
        '#IGNORE': { s: '#SP,#CM' },
    };
    let options = {
        error: {
            csv_unexpected_field: 'unexpected field value: $fsrc'
        },
        hint: {
            csv_unexpected_field: `Row $row has too many fields (the first of which is: $fsrc). Only $len
fields per row are expected.`,
        },
        string: {
            escapedouble: true,
        },
        token: token
    };
    // If strict, don't parse JSON structures inside fields.
    // NOTE: this is how you "turn off" tokens
    if (plugin_opts.strict) {
        token['#OB'] = false;
        token['#CB'] = false;
        token['#OS'] = false;
        token['#CS'] = false;
        token['#CL'] = false;
        token['#ST'] = '"';
        options.number = { lex: false };
        options.comment = false;
        options.string.multiline = '';
        options.string.block = {};
        options.value = {};
    }
    jsonic.options(options);
    let LN = jsonic.token.LN;
    let ZZ = jsonic.token.ZZ;
    // Match alt only if first occurrence of rule 
    let first = (_alt, rule, ctx) => {
        let use = ctx.use.csv = (ctx.use.csv || {});
        let frm = use.frm = (use.frm || { val: true, list: true, record: true });
        let res = (frm[rule.name] && (frm[rule.name] = false, true)); // locking latch
        return res;
    };
    jsonic.rule('val', (rs) => {
        rs.def.open.unshift({ c: first, p: 'list' });
        return rs;
    });
    jsonic.rule('list', (rs) => {
        rs.def.open.unshift({ c: first, p: 'record' });
        return rs;
    });
    jsonic.rule('elem', (rs) => {
        rs.def.close.unshift({ s: [LN], b: 1 }); // End list
        return rs;
    });
    jsonic.rule('record', (_ignore) => {
        let rs = new jsonic_1.RuleSpec({
            open: [
                { s: [LN], r: 'record' },
                { p: 'list' },
            ],
            close: [
                { s: [LN, ZZ] },
                { s: [LN], r: 'record' }
            ],
            bc: (rule, ctx) => {
                let fields = ctx.use.fields;
                if (null == fields) {
                    fields = ctx.use.fields = rule.child.node;
                }
                else {
                    let record = {};
                    for (let i = 0; i < rule.child.node.length; i++) {
                        let field_name = fields[i];
                        if (null == field_name) {
                            let out = {
                                err: 'csv_unexpected_field',
                                fsrc: ctx.u1.src,
                                index: i,
                                len: fields.length,
                                row: ctx.u1.row,
                            };
                            return out;
                        }
                        record[field_name] = rule.child.node[i];
                    }
                    rule.node.push(record);
                }
            }
        });
        return rs;
    });
};
exports.Csv = Csv;
//# sourceMappingURL=csv.js.map