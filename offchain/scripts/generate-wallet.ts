import { Lucid, Koios, generateSeedPhrase } from "@lucid-evolution/lucid";

const seedPhrase = generateSeedPhrase();

console.log(seedPhrase);

const lucid = await Lucid(
    new Koios("https://preview.koios.rest/api/v1"),
    "Preview",
);

lucid.selectWallet.fromSeed(seedPhrase);

const address = lucid.wallet().address();

console.log(address);

