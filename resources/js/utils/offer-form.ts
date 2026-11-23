/**
 * The offer form keeps every field as a string, but the server may send a stored compensation as a number.
 * Handing the number to the form made its first step refuse an unchanged value ("expected string, received number").
 */
export function commissionFieldValue(
    commission?: { commission_value?: string | number | null } | null,
): string {
    const value = commission?.commission_value;
    return value === null || value === undefined ? '0.00' : String(value);
}
