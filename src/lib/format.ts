const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export const formatMoney = (value: number) => currency.format(value)
