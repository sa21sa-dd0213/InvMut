import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m8ebed5ce - isEqual hash function mismatch", function () {
  it("should kill mutant by verifying isEqual returns true for identical strings with original sha256 comparison", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy DAO (no constructor arguments needed based on original contract)
    const Factory = await ethers.getContractFactory("DAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test that isEqual returns true for identical strings using the same hash function
    // In the original, sha256("GRANT") == sha256("GRANT") returns true
    // In the mutant, sha256("GRANT") == keccak256("GRANT") returns false (different hashes)
    const result = await instance.isEqual(
      ethers.toUtf8Bytes("GRANT"),
      ethers.toUtf8Bytes("GRANT")
    );
    
    // Original returns true, mutant returns false - this assertion will fail on mutant
    expect(result).to.be.true;
  });
});