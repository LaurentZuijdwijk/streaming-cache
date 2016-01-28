'use strict';

function ensureDefined(value, name) {
    if (!value) {
        throw (new Error(name + ' expected'));
    }
};

function assign(target, source) {
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            target[key] = source[key];
        }
    }
    return target;
};

module.exports.ensureDefined = ensureDefined;
module.exports.assign = assign;
