export type TDirection = 'source' | 'target' | 'bi' | undefined
export const idUtils = {
  /**
   * Combine two ids independent of their direction, will return the same output.
   * @param idA
   * @param idB
   * @returns
   */
  combine(idA: string, idB: string): string {
    return idA > idB ? `${idA}_${idB}` : `${idB}_${idA}`
  },

  split(combinedId: string): [string, string] {
    return combinedId.split('_') as [string, string]
  },

  direction(idA: string, idB: string): 'source' | 'target' {
    return idA > idB ? 'source' : 'target'
  },

  mergeDirections(
    currentDirection: TDirection,
    addedDirection: TDirection
  ): TDirection {
    if (currentDirection === 'bi' || addedDirection === 'bi') {
      return 'bi'
    }
    if (!currentDirection) {
      return addedDirection
    }
    if (!addedDirection) {
      return currentDirection
    }
    return currentDirection === addedDirection ? currentDirection : 'bi'
  }
}
