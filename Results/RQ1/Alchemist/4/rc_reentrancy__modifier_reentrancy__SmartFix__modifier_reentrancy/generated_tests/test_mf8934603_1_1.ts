import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant mf8934603 detection", function () {
  it("should revert on original but pass on mutant when Bank returns a hash less than Nu Token hash", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the main contract (no constructor arguments)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancyFactory.deploy();
    await modEntrancy.waitForDeployment();
    
    // Deploy a malicious Bank that returns a hash smaller than keccak256("Nu Token")
    const MaliciousBankFactory = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBankFactory.deploy();
    await maliciousBank.waitForDeployment();
    
    // Call airDrop from the malicious bank address
    // On original: should revert because hash != hash (strict equality)
    // On mutant: should pass because hash <= hash (the smaller hash passes the <= check)
    await expect(
      modEntrancy.connect(maliciousBank).airDrop()
    ).to.be.reverted;
  });
});