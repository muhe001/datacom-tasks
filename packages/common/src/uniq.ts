export function unique<ArrayType>(array: Array<ArrayType>) {
  return Array.from(new Set(array))
}

export function getUniqueArrayOfObjects<ArrayType>(array: Array<ArrayType>) {
  const uniqueArrayOfObjects: Array<ArrayType> = []
  array.forEach((item) => {
    const exists = uniqueArrayOfObjects.some((value) => JSON.stringify(value) === JSON.stringify(item))
    if (!exists) {
      uniqueArrayOfObjects.push(item)
    }
  })

  return uniqueArrayOfObjects
}
