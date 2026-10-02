import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection", function () {
  it("should revert when malicious contract returns a smaller bytes32 value in supportsToken", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy a malicious Bank contract that returns a bytes32 value smaller than the expected hash
    const MaliciousBankFactory = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBankFactory.deploy();
    await maliciousBank.waitForDeployment();

    // Deploy the ModifierEntrancy contract (no constructor args needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modifierEntrancy = await ModifierEntrancyFactory.deploy();
    await modifierEntrancy.waitForDeployment();

    // Attacker calls airDrop through the malicious bank contract
    // The malicious bank's supportsToken() returns a value that is numerically smaller
    // than keccak256("Nu Token"), so the mutant's <= check would pass,
    // but the original's == check would revert
    await expect(
      maliciousBank.connect(attacker).attack(modifierEntrancy.target)
    ).to.be.reverted;
  });
});

// Malicious contract to exploit the mutant
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    // Return a bytes32 value that is numerically smaller than keccak256("Nu Token")
    // keccak256("Nu Token") = 0x9f8f7a6b... we return 0x0000000000000000000000000000000000000000000000000000000000000001
    return bytes32(0x0000000000000000000000000000000000000000000000000000000000000001);
  }

  function attack(address target) external {
    // Call airDrop on the ModifierEntrancy contract
    (bool success, ) = target.call(abi.encodeWithSignature("airDrop()"));
    require(success, "airDrop failed");
  }
}