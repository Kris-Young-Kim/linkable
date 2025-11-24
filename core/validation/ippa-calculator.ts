export type IppaInput = {
  importance: number
  preDifficulty: number
  postDifficulty: number
}

export const calculateEffectiveness = ({ importance, preDifficulty, postDifficulty }: IppaInput) => {
  return (preDifficulty - postDifficulty) * importance
}

