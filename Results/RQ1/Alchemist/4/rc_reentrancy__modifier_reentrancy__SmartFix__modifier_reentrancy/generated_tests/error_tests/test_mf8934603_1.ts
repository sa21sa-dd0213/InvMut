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
    
    // Set attacker to be the malicious bank contract
    const attackerAsBank = await ethers.getSigner(maliciousBank.target);
    
    // Call airDrop from the malicious bank address
    // On original: should revert because hash != hash (strict equality)
    // On mutant: should pass because hash <= hash (the smaller hash passes the <= check)
    await expect(
      modEntrancy.connect(attackerAsBank).airDrop()
    ).to.be.reverted;
  });
});

// Deploy this malicious contract first
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    // Return a hash that is numerically smaller than keccak256("Nu Token")
    // keccak256("Nu Token") = 0x9a8c9a8c... (example, actual value will be smaller)
    return bytes32(0x0000000000000000000000000000000000000000000000000000000000000001);
  }
}