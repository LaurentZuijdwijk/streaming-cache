'use strict';

module.exports.ensureDefined = function (value, name) {
    if (!value) {
        throw (new Error(name + ' expected'));
    }
}