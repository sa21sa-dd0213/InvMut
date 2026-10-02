import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
  it("should kill mutant m119c7296 by calling airDrop from a contract returning a higher hash", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the attacker contract that returns a hash numerically greater than keccak256("Nu Token")
    const AttackerFactory = await ethers.getContractFactory("MaliciousBank");
    const attacker = await AttackerFactory.deploy();
    await attacker.waitForDeployment();

    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();

    // Fund the attacker contract with some ETH to call airDrop
    await owner.sendTransaction({
      to: await attacker.getAddress(),
      value: ethers.parseEther("1")
    });

    // Call airDrop from the attacker contract - should revert on original but pass on mutant
    await expect(
      attacker.connect(addr1).attack(await instance.getAddress())
    ).to.be.reverted;
  });
});

// Malicious contract that returns a hash > keccak256("Nu Token")
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    // Return hash of "Zu Token" which is numerically greater than hash of "Nu Token"
    return keccak256(abi.encodePacked("Zu Token"));
  }

  function attack(address target) external {
    (bool success, ) = target.call(abi.encodeWithSignature("airDrop()"));
    require(success, "airDrop failed");
  }
}