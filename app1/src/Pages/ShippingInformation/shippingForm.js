export function createShippingForm(activeSession) {
    return {
        fullName: activeSession?.username || '',
        email: activeSession?.email || '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'مصر',
        notes: ''
    }
}
