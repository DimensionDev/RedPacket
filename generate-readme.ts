import path from 'path'
import fs from 'fs/promises'
import { format } from 'prettier'
import { getAllBrowserPath } from './SmartContractProjectConfig/chains'
import { parse } from 'csv-parse/sync'

const README_PATH = path.resolve(__dirname, 'README.md')
const ADDRESS_TABLE_PATH = path.resolve(__dirname, 'contract-addresses.csv')
let contractPath: Record<string, string>
type DeployedAddressRow = {
  Chain: string
  HappyRedPacket: string
  HappyRedPacket_ERC721: string
}

async function main() {
  const content = await fs.readFile(README_PATH, 'utf-8')
  contractPath = await getAllBrowserPath('address')
  const rows: DeployedAddressRow[] = await loadDeployedAddressRows()
  const replaced = replace(content, Array.from(makeTable(rows)).filter(Boolean).join('\n'))
  const formatted = format(replaced, {
    parser: 'markdown',
    printWidth: 160,
  })
  await fs.writeFile(README_PATH, formatted, 'utf-8')
}

main()

function* makeTable(rows: DeployedAddressRow[]) {
  yield '| Chain | HappyRedPacket | HappyRedPacket_ERC721 |'
  yield '| - | - | - |'
  for (const { Chain, HappyRedPacket, HappyRedPacket_ERC721 } of rows) {
    const rpElement = formElement(HappyRedPacket, `rp-${Chain}`)
    const nftRpElement = formElement(HappyRedPacket_ERC721, `rp721-${Chain}`)
    yield `| ${Chain} | ${rpElement} | ${nftRpElement} |`
  }
  yield ''
  yield* rows.map(({ Chain, HappyRedPacket }) => formLink(HappyRedPacket, Chain, 'rp'))
  yield* rows.map(({ Chain, HappyRedPacket_ERC721 }) => formLink(HappyRedPacket_ERC721, Chain, 'rp721'))
}

async function loadDeployedAddressRows(): Promise<DeployedAddressRow[]> {
  const data = await fs.readFile(ADDRESS_TABLE_PATH, 'utf-8')
  const columns = ['Chain', 'HappyRedPacket', 'HappyRedPacket_ERC721']
  return parse(data, { delimiter: ',', columns, from: 2 })
}

function formElement(address: string, linkTag: string) {
  if (address == '') {
    return ''
  }
  return `[\`${address.slice(0, 10)}\`][${linkTag}]`
}

function formLink(address: string, chain: string, contract: string) {
  if (address == '') {
    return null
  }
  const browserPath = contractPath[chain] + address
  return `[${contract}-${chain}]:${browserPath}`
}

function replace(content: string, replace: string) {
  const pattern = new RegExp(`(<!-- begin RedPacket -->)(.+)(<!-- end RedPacket -->)`, 'gs')
  return content.replace(pattern, `$1\n${replace}\n$3`)
}
