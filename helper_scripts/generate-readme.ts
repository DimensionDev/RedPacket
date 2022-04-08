import path from "path";
import fs from "fs/promises";
import { format } from "prettier";
import { ChainId, BlockExplorer, DeployedAddressRow } from "./types";
import { parse } from "csv-parse/sync";

const README_PATH = path.resolve(__dirname, "..", "README.md");
const ADDRESS_TABLE_PATH = path.resolve(__dirname, "contract-addresses.csv");

async function main() {
  const content = await fs.readFile(README_PATH, "utf-8");
  const rows: DeployedAddressRow[] = await loadDeployedAddressRows();
  const replaced = replace(
    content,
    Array.from(makeTable(rows)).filter(Boolean).join("\n")
  );
  const formatted = format(replaced, {
    parser: "markdown",
    printWidth: 160,
  });

  await fs.writeFile(README_PATH, formatted, "utf-8");
}

main();

function* makeTable(rows: DeployedAddressRow[]) {
  yield "| Chain | HappyRedPacket | HappyRedPacket_ERC721 |";
  yield "| - | - | - |";
  for (const { Chain, HappyRedPacket, HappyRedPacket_ERC721 } of rows) {
    const rpElement = formElement(HappyRedPacket, `rp-${Chain}`);
    const nftRpElement = formElement(HappyRedPacket_ERC721, `rp721-${Chain}`);
    yield `| ${Chain} | ${rpElement} | ${nftRpElement} |`;
  }
  yield "";
  yield* rows.map(({ Chain, HappyRedPacket }) => formLink(HappyRedPacket, Chain, "rp"))
  yield* rows.map(({ Chain, HappyRedPacket_ERC721 }) => formLink(HappyRedPacket_ERC721, Chain, "rp721"))
}

async function loadDeployedAddressRows(): Promise<DeployedAddressRow[]> {
  const data = await fs.readFile(ADDRESS_TABLE_PATH, "utf-8");
  const columns = ['Chain', 'HappyRedPacket', 'HappyRedPacket_ERC721'];
  return parse(data, { delimiter: ',', columns, from: 2 });
}

function formElement(address: string, linkTag: string) {
  if (address == '') {
    return ''
  }
  return `[\`${address.slice(0, 10)}\`][${linkTag}]`;
}

function formLink(address: string, chain: string, contract: string) {
  if (address == '') {
    return null;
  }
  const requiredChainId = getEnumAsMap(ChainId).get(chain);
  const browserPath = BlockExplorer[requiredChainId as ChainId](address);
  return `[${contract}-${chain}]:${browserPath}`;
}

function replace(content: string, replace: string) {
  const pattern = new RegExp(
    `(<!-- begin RedPacket -->)(.+)(<!-- end RedPacket -->)`,
    "gs"
  );
  return content.replace(pattern, `$1\n${replace}\n$3`);
}

function getEnumAsMap<T extends object>(enumObject: T) {
  const pairs = new Map<string, T[keyof T]>();
  for (const key of Object.keys(enumObject)) {
    if (Number.isNaN(Number.parseInt(key))) {
      pairs.set(key, enumObject[key as keyof T]);
    }
  }
  return pairs;
}
