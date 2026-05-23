export type AdNodeRole = "admin" | "settlement";

function readAddressSet(envName: string) {
  return new Set(
    String(process.env[envName] || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function hasRole(address: string, role: AdNodeRole) {
  const normalized = address.toLowerCase();
  const admins = readAddressSet("ADNODE_ADMIN_ADDRESSES");
  if (admins.has(normalized)) return true;

  if (role === "settlement") {
    return readAddressSet("ADNODE_SETTLEMENT_OPERATOR_ADDRESSES").has(normalized);
  }

  return false;
}

export function assertRole(address: string, role: AdNodeRole) {
  if (!hasRole(address, role)) {
    throw new Error(`Wallet is not authorized for ${role} operations.`);
  }
}
