import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy - kill mutant m647242dd", function () {
  it("should revert when calling airDrop from a contract that does not support 'Nu Token'", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the malicious Bank contract that returns wrong supportsToken
    const MaliciousBankFactory = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBankFactory.deploy();
    await maliciousBank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Connect the malicious bank contract as msg.sender to call airDrop
    const instanceFromBank = instance.connect(maliciousBank);
    
    // Expect revert because supportsToken modifier should fail
    await expect(
      instanceFromBank.airDrop()
    ).to.be.reverted;
  });
});

// Malicious contract that returns wrong supportsToken value
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    return keccak256(abi.encodePacked("Wrong Token"));
  }
}