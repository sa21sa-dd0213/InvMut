import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m119c7296 - supportsToken >= replacement", function () {
  it("should kill mutant by calling airDrop from a malicious contract returning a larger bytes32", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the malicious Bank contract that returns a bytes32 value
    // larger than keccak256("Nu Token") when supportsToken() is called
    const MaliciousBank = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBank.deploy();
    await maliciousBank.waitForDeployment();

    // Deploy the ModifierEntrancy contract (no constructor arguments needed)
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancy.deploy();
    await instance.waitForDeployment();

    // Attacker calls airDrop through the malicious bank contract
    // This should revert on original (strict equality) but pass on mutant (>=)
    await expect(
      maliciousBank.connect(attacker).attack(await instance.getAddress())
    ).to.be.reverted;
  });
});