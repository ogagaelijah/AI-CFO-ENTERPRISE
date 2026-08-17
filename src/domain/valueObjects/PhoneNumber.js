// src/domain/valueObjects/PhoneNumber.js

class PhoneNumber {
    constructor(phone) {
        this.value = this.validate(phone);
    }

    validate(phone) {
        if (!phone || typeof phone !== 'string') {
            throw new Error('Phone number is required');
        }

        const cleaned = phone.replace(/[^0-9+]/g, '');
        
        let number = cleaned;
        if (number.startsWith('+234')) {
            number = number.substring(1);
        }
        
        if (number.startsWith('0') && number.length === 11) {
            number = '234' + number.substring(1);
        } else if (number.length === 10 && !number.startsWith('0')) {
            number = '234' + number;
        }

        if (!/^234[0-9]{10}$/.test(number)) {
            throw new Error('Invalid Nigerian phone number');
        }

        return number;
    }

    getValue() { return this.value; }
    
    getFormatted() {
        const parts = this.value.match(/(234)([0-9]{3})([0-9]{3})([0-9]{4})/);
        if (parts) {
            return `+${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]}`;
        }
        return `+${this.value}`;
    }

    getLocalFormat() {
        if (this.value.startsWith('234')) {
            return '0' + this.value.substring(3);
        }
        return this.value;
    }

    toString() { return this.getFormatted(); }
    equals(other) { return other instanceof PhoneNumber && this.value === other.value; }
}

module.exports = PhoneNumber;