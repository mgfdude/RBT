function assertPositiveAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error(
      "Amount must be a positive integer in paise"
    );

    error.code = "INVALID_AMOUNT";
    error.status = 400;

    throw error;
  }

  return amount;
}

function rupeesToPaise(rupees) {
  if (
    typeof rupees !== "number" ||
    !Number.isFinite(rupees) ||
    rupees < 0
  ) {
    const error = new Error("Invalid rupee amount");
    error.code = "INVALID_AMOUNT";
    error.status = 400;
    throw error;
  }

  const paise = Math.round(rupees * 100);

  if (!Number.isSafeInteger(paise)) {
    const error = new Error("Amount is too large");
    error.code = "AMOUNT_TOO_LARGE";
    error.status = 400;
    throw error;
  }

  return paise;
}

module.exports = {
  assertPositiveAmount,
  rupeesToPaise,
};