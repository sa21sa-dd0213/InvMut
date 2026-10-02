import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection test", function () {
  it("should revert when calling airDrop from a contract that does not support the token (detects removal of supportsToken modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const modifierEntrancy = await ModifierEntrancy.deploy();
    await modifierEntrancy.waitForDeployment();
    
    // Deploy a malicious Bank contract that returns wrong supportsToken
    const MaliciousBank = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBank.deploy();
    await maliciousBank.waitForDeployment();
    
    // Call airDrop from the malicious bank contract - should revert in original but pass in mutant
    await expect(
      modifierEntrancy.connect(maliciousBank.getSigner()).airDrop()
    ).to.be.reverted;
  });
});

// Helper contract to be deployed
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    return keccak256(abi.encodePacked("Wrong Token"));
  }
  
  function getSigner() external view returns (address) {
    return address(this);
  }
}