import { z }from 'zod'
import { LineGroup } from './types'

export const LineGroupEnum = z.nativeEnum(LineGroup)