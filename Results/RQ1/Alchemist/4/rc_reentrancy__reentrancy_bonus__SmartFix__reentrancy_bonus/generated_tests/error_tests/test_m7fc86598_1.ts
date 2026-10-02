import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant m7fc86598 test", function () {
  it("should revert when recipient contract rejects Ether in original, but succeed in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Reentrancy_bonus contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    const maliciousAddress = await malicious.getAddress();
    
    // Call getFirstWithdrawalBonus with the malicious contract as recipient
    // In the original contract with require(success), this should revert
    // In the mutant without require(success), this would succeed (but incorrectly)
    await expect(
      instance.connect(addr1).getFirstWithdrawalBonus(maliciousAddress)
    ).to.be.reverted;
  });
});

// Helper contract that rejects all incoming Ether
contract("MaliciousReceiver", function () {
  // This is a Solidity contract deployed via Hardhat for testing
  // The actual contract is deployed using Solidity source
});