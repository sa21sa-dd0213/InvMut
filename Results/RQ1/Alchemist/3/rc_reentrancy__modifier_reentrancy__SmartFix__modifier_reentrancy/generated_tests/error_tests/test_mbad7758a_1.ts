import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - supportsToken modifier", function () {
  it("should kill mutant by calling airDrop from a malicious Bank contract that returns wrong token name", async function () {
    // Deploy the malicious Bank contract
    const MaliciousBank = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBank.deploy();
    await maliciousBank.waitForDeployment();

    // Deploy ModifierEntrancy
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const modifierEntrancy = await ModifierEntrancy.deploy();
    await modifierEntrancy.waitForDeployment();

    // Get signers
    const [owner, attacker] = await ethers.getSigners();

    // Connect attacker as msg.sender (Bank contract will call airDrop)
    // The attacker deploys maliciousBank and calls airDrop through it
    // First, ensure attacker has no token balance
    expect(await modifierEntrancy.tokenBalance(attacker.address)).to.equal(0);

    // Call airDrop from maliciousBank which has supportsToken returning wrong name
    // The original contract should revert because token name doesn't match
    // The mutant should NOT revert, thus the test will fail on mutant (killing it)
    await expect(
      maliciousBank.connect(attacker).attack(modifierEntrancy.target)
    ).to.be.reverted;
  });
});

// Malicious Bank contract that returns wrong token name
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    return keccak256(abi.encodePacked("Fake Token"));
  }

  function attack(address target) external {
    // This will call ModifierEntrancy.airDrop() which has supportsToken modifier
    (bool success, ) = target.call(abi.encodeWithSignature("airDrop()"));
    require(success, "call failed");
  }
}