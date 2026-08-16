const BANKS = {
  alpha: {
    id: "alpha",
    name: "Bank Alpha",
    code: "ALPHA",
    ifscCode: "RBTB0000001",
    status: "ACTIVE",
  },

  beta: {
    id: "beta",
    name: "Bank Beta",
    code: "BETA",
    ifscCode: "RBTB0000002",
    status: "ACTIVE",
  },

  gamma: {
    id: "gamma",
    name: "Bank Gamma",
    code: "GAMMA",
    ifscCode: "RBTB0000003",
    status: "ACTIVE",
  },
};

function getBank(bankId) {
  return BANKS[bankId] || null;
}

function getAllBanks() {
  return Object.values(BANKS);
}

module.exports = {
  BANKS,
  getBank,
  getAllBanks,
};