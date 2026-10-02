import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
  it("should kill mutant m119c7296 by calling airDrop from a contract that returns a larger keccak256 hash", async function () {
    // Deploy the attacker contract that returns a larger hash
    const AttackerFactory = await ethers.getContractFactory("MaliciousBank");
    const attacker = await AttackerFactory.deploy();
    await attacker.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the attacker's signer
    const [owner] = await ethers.getSigners();

    // Call airDrop from the attacker contract
    // The original contract should revert because the hash doesn't match exactly
    // The mutant should pass because "0x02..." >= "0x01..." is true
    await expect(
      attacker.connect(owner).attack(await instance.getAddress())
    ).to.be.reverted;
  });
});

// MaliciousBank contract that returns a larger keccak256 hash
// This contract must be deployed separately
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    // Return a hash that is lexicographically larger than keccak256("Nu Token")
    return 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
  }

  function attack(address target) external {
    // Cast target to ModifierEntrancy and call airDrop
    (bool success, ) = target.call(abi.encodeWithSignature("airDrop()"));
    require(success, "airDrop failed");
  }
}