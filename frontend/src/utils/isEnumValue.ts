export function isEnumValue(value: string, enumType: any): boolean {
  return Object.values(enumType).includes(value)
}

export function isKeyofEnum(value: string, enumType: any): boolean {
  return Object.keys(enumType).includes(value)
}
