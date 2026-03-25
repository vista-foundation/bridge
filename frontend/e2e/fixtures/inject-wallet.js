/**
 * CIP-30 mock wallet for Playwright E2E tests.
 * Injected via page.addInitScript() before page loads.
 * Delegates signing/submission to backend test wallet API.
 */
(function () {
  const BACKEND_URL = "http://localhost:3001";
  let _addressHex = null;

  async function getAddressHex() {
    if (_addressHex) return _addressHex;
    const resp = await fetch(BACKEND_URL + "/api/test/wallet/address");
    const data = await resp.json();
    _addressHex = data.hex;
    return _addressHex;
  }

  const mockApi = {
    getNetworkId: async function () {
      return 0;
    },
    getBalance: async function () {
      const resp = await fetch(BACKEND_URL + "/api/test/wallet/balance");
      const data = await resp.json();
      return data.cborHex;
    },
    getChangeAddress: async function () {
      return await getAddressHex();
    },
    getRewardAddresses: async function () {
      return [];
    },
    getUsedAddresses: async function () {
      const hex = await getAddressHex();
      return [hex];
    },
    getUnusedAddresses: async function () {
      return [];
    },
    getUtxos: async function () {
      return null;
    },
    signTx: async function (txHex) {
      const resp = await fetch(BACKEND_URL + "/api/test/wallet/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txCborHex: txHex }),
      });
      const data = await resp.json();
      if (data.error) throw new Error("Sign failed: " + data.error);
      return data.signedTxHex;
    },
    submitTx: async function (txHex) {
      const resp = await fetch(BACKEND_URL + "/api/test/wallet/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedTxHex: txHex }),
      });
      const data = await resp.json();
      if (data.error) throw new Error("Submit failed: " + data.error);
      return data.txHash;
    },
    signData: async function () {
      throw new Error("signData not implemented");
    },
  };

  window.cardano = window.cardano || {};
  window.cardano.playwright = {
    name: "Playwright Test Wallet",
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='80' font-size='80'>T</text></svg>",
    apiVersion: "0.1.0",
    enable: async function () {
      return mockApi;
    },
    isEnabled: async function () {
      return true;
    },
  };

  console.log("[Playwright] CIP-30 test wallet injected");
})();
