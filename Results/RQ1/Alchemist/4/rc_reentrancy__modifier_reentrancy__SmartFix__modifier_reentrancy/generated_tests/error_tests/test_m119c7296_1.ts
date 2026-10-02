import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m119c7296 - supportsToken >= replacement", function () {
  it("should revert when called from a contract that returns a larger hash value (mutant would pass)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the malicious Bank contract that returns a hash value greater than "Nu Token"
    const MaliciousBankFactory = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBankFactory.deploy();
    await maliciousBank.waitForDeployment();

    // Deploy ModifierEntrancy
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();

    // Attacker calls airDrop() through the malicious Bank contract
    // The malicious Bank returns a hash larger than keccak256("Nu Token"), which should fail the == check in original
    await expect(
      maliciousBank.connect(attacker).attack(await instance.getAddress())
    ).to.be.reverted;
  });
});

// Helper contract to be deployed in the test
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    // Return a value strictly greater than keccak256("Nu Token")
    bytes32 nuTokenHash = keccak256(abi.encodePacked("Nu Token"));
    return bytes32(uint256(nuTokenHash) + 1);
  }

  function attack(address target) external {
    // Cast target to ModifierEntrancy and call airDrop
    (bool success, ) = target.call(abi.encodeWithSignature("airDrop()"));
    require(success, "airDrop failed");
  }
}