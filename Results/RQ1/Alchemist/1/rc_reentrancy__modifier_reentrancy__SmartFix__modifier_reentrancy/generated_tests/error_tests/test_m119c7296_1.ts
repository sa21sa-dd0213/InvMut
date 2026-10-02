import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - m119c7296", function () {
  it("should kill mutant by calling airDrop from a malicious Bank that returns a larger hash", async function () {
    // Deploy the malicious Bank contract that returns a hash >= the expected hash
    const MaliciousBank = await ethers.getContractFactory("Bank");
    const maliciousBank = await MaliciousBank.deploy();
    await maliciousBank.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancy.deploy();
    await instance.waitForDeployment();

    // Get signers
    const [owner, attacker] = await ethers.getSigners();

    // Deploy a malicious contract that will call airDrop through the Bank interface
    // The attacker deploys a contract that implements supportsToken() returning a hash larger than "Nu Token"
    const MaliciousCallerFactory = await ethers.getContractFactory("MaliciousCaller");
    const maliciousCaller = await MaliciousCallerFactory.deploy(await instance.getAddress());
    await maliciousCaller.waitForDeployment();

    // Call airDrop through the malicious caller
    // This should succeed on mutant (>= check) but fail on original (== check)
    await expect(
      maliciousCaller.connect(attacker).callAirDrop()
    ).to.be.reverted;
  });
});

// Helper contract to be deployed that returns a larger hash
contract MaliciousCaller {
    ModifierEntrancy public target;
    
    constructor(address _target) {
        target = ModifierEntrancy(_target);
    }
    
    function supportsToken() external pure returns (bytes32) {
        // Return a hash that is lexicographically larger than keccak256("Nu Token")
        // "Nu Token" hash: 0x8c5a... we'll return a hash starting with 0xff...
        return 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    }
    
    function callAirDrop() external {
        target.airDrop();
    }
}