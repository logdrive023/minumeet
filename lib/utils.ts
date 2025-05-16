import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// src/utils/stateUtils.ts

/** Remove acentos e caracteres especiais */
function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, '');
}

const stateMap: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

/**
 * Retorna a sigla de um estado a partir do nome completo.
 * @param stateName Nome do estado (e.g. "São Paulo")
 * @returns Sigla em maiúsculas (e.g. "SP") ou null se não encontrado
 */
export function getStateAbbreviation(stateName: string): string | null {
  if (typeof stateName !== 'string') {
    throw new TypeError('O nome do estado deve ser uma string');
  }
  const key = removeAccents(stateName).trim().toLowerCase();
  return stateMap[key] || null;
}
