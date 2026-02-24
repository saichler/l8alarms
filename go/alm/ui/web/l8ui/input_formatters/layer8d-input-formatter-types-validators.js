/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * ERP Input Formatter - Validation-Heavy Type Definitions
 * ID formats (SSN, EIN, Routing), Contact formats (Phone, Email, URL), Color
 */
(function() {
    'use strict';

    const { utils, masks } = Layer8DInputFormatter;

    window.Layer8DInputFormatterValidators = {

        // ----------------------------------------
        // SSN: XXX-XX-XXXX
        // ----------------------------------------
        ssn: {
            mask: '###-##-####',
            placeholder: '___-__-____',

            format(raw) {
                if (!raw) return '';
                const digits = utils.extractDigits(raw);
                return masks.applyMask(digits, this.mask);
            },

            parse(formatted) {
                return utils.extractDigits(formatted);
            },

            validate(raw) {
                const digits = utils.extractDigits(raw);
                const errors = [];

                if (digits.length === 0) {
                    return { valid: true, errors: [] };
                }

                if (digits.length !== 9) {
                    errors.push('SSN must be 9 digits');
                }

                if (digits.length === 9) {
                    const area = digits.substring(0, 3);
                    const group = digits.substring(3, 5);
                    const serial = digits.substring(5, 9);

                    if (area === '000' || area === '666' || area.startsWith('9')) {
                        errors.push('Invalid SSN area number');
                    }
                    if (group === '00') {
                        errors.push('Invalid SSN group number');
                    }
                    if (serial === '0000') {
                        errors.push('Invalid SSN serial number');
                    }
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value, masked = true) {
                const formatted = this.format(value);
                if (!formatted || !masked) return formatted;
                return '***-**-' + formatted.slice(-4);
            }
        },

        // ----------------------------------------
        // Phone: (XXX) XXX-XXXX
        // ----------------------------------------
        phone: {
            mask: '(###) ###-####',
            placeholder: '(___) ___-____',

            format(raw) {
                if (!raw) return '';
                const digits = utils.extractDigits(raw);
                return masks.applyMask(digits, this.mask);
            },

            parse(formatted) {
                return utils.extractDigits(formatted);
            },

            validate(raw) {
                const digits = utils.extractDigits(raw);
                const errors = [];

                if (digits.length === 0) {
                    return { valid: true, errors: [] };
                }

                if (digits.length !== 10) {
                    errors.push('Phone number must be 10 digits');
                }

                if (digits.length >= 3) {
                    const areaCode = digits.substring(0, 3);
                    if (areaCode[0] === '0' || areaCode[0] === '1') {
                        errors.push('Invalid area code');
                    }
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value) {
                return this.format(value);
            }
        },

        // ----------------------------------------
        // Bank Routing Number: 9 digits with ABA checksum
        // ----------------------------------------
        routingNumber: {
            mask: '#########',

            format(raw) {
                if (!raw) return '';
                return utils.extractDigits(raw).substring(0, 9);
            },

            parse(formatted) {
                return utils.extractDigits(formatted);
            },

            validate(raw) {
                const digits = utils.extractDigits(raw);
                const errors = [];

                if (digits.length === 0) {
                    return { valid: true, errors: [] };
                }

                if (digits.length !== 9) {
                    errors.push('Routing number must be 9 digits');
                    return { valid: false, errors };
                }

                // ABA checksum validation
                const d = digits.split('').map(Number);
                const checksum = (
                    3 * (d[0] + d[3] + d[6]) +
                    7 * (d[1] + d[4] + d[7]) +
                    (d[2] + d[5] + d[8])
                ) % 10;

                if (checksum !== 0) {
                    errors.push('Invalid routing number checksum');
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value) {
                return this.format(value);
            }
        },

        // ----------------------------------------
        // EIN (Tax ID): XX-XXXXXXX
        // ----------------------------------------
        ein: {
            mask: '##-#######',
            placeholder: '__-_______',

            format(raw) {
                if (!raw) return '';
                const digits = utils.extractDigits(raw);
                return masks.applyMask(digits, this.mask);
            },

            parse(formatted) {
                return utils.extractDigits(formatted);
            },

            validate(raw) {
                const digits = utils.extractDigits(raw);
                const errors = [];

                if (digits.length === 0) {
                    return { valid: true, errors: [] };
                }

                if (digits.length !== 9) {
                    errors.push('EIN must be 9 digits');
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value) {
                return this.format(value);
            }
        },

        // ----------------------------------------
        // Email
        // ----------------------------------------
        email: {
            format(raw) {
                if (!raw) return '';
                return String(raw).toLowerCase().trim();
            },

            parse(formatted) {
                return formatted ? formatted.toLowerCase().trim() : '';
            },

            validate(value) {
                const errors = [];

                if (!value) {
                    return { valid: true, errors: [] };
                }

                if (!utils.isValidEmail(value)) {
                    errors.push('Invalid email format');
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value) {
                return this.format(value);
            }
        },

        // ----------------------------------------
        // URL
        // ----------------------------------------
        url: {
            format(raw) {
                if (!raw) return '';
                let url = String(raw).trim();
                if (url && !url.match(/^https?:\/\//i)) {
                    url = 'https://' + url;
                }
                return url;
            },

            parse(formatted) {
                return formatted ? formatted.trim() : '';
            },

            validate(value) {
                const errors = [];

                if (!value) {
                    return { valid: true, errors: [] };
                }

                if (!utils.isValidUrl(value)) {
                    errors.push('Invalid URL format');
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value) {
                return this.format(value);
            }
        },

        // ----------------------------------------
        // Color Code (Hex)
        // ----------------------------------------
        colorCode: {
            format(raw) {
                if (!raw) return '';
                let color = String(raw).trim().toUpperCase();
                if (color && !color.startsWith('#')) {
                    color = '#' + color;
                }
                return color;
            },

            parse(formatted) {
                if (!formatted) return '';
                return formatted.replace('#', '').toUpperCase();
            },

            validate(value) {
                const errors = [];

                if (!value) {
                    return { valid: true, errors: [] };
                }

                if (!utils.isValidHexColor(value)) {
                    errors.push('Invalid hex color code');
                }

                return { valid: errors.length === 0, errors };
            },

            formatDisplay(value) {
                return this.format(value);
            }
        }
    };

})();
