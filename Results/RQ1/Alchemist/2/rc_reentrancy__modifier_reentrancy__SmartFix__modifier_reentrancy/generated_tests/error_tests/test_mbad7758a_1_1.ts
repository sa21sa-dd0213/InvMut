import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant mbad7758a test", function () {
  it("should revert when calling airDrop from a contract that does not support 'Nu Token'", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the ModifierEntrancy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that does NOT support 'Nu Token'
    const MaliciousFactory = await ethers.getContractFactory("MaliciousBank");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Call airDrop from the malicious contract address - this should revert
    // because the supportsToken modifier checks if Bank(msg.sender).supportsToken()
    // returns the correct keccak256 hash for "Nu Token"
    await expect(
      instance.connect(malicious).airDrop()
    ).to.be.reverted;
  });
});