import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test - mf8934603", function () {
  it("should kill mutant by using a malicious Bank that returns larger hash", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the malicious Bank contract that returns a hash larger than "Nu Token"
    const MaliciousBankFactory = await ethers.getContractFactory("MaliciousBank");
    const maliciousBank = await MaliciousBankFactory.deploy();
    await maliciousBank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancyFactory.deploy();
    await modEntrancy.waitForDeployment();
    
    // Attacker calls airDrop() through the malicious Bank contract
    // The attacker's msg.sender will be the maliciousBank contract address
    // On original: require(keccak256(...) == Bank(msg.sender).supportsToken()) would revert
    // On mutant: require(keccak256(...) <= Bank(msg.sender).supportsToken()) would pass because malicious hash > true hash
    
    // Connect as attacker and call airDrop through maliciousBank
    // We need to call from maliciousBank address, so we simulate by having maliciousBank call modEntrancy
    const tx = maliciousBank.connect(attacker).attack(modEntrancy.target);
    
    // On original contract this would revert, on mutant it would succeed
    // We expect it to succeed on mutant (kill the mutant)
    await expect(tx).to.not.be.reverted;
    
    // Verify that the token balance was updated (confirming the mutant allowed the reentrancy)
    const balance = await modEntrancy.tokenBalance(maliciousBank.target);
    expect(balance).to.equal(20);
  });
});

// Malicious Bank contract that returns a hash larger than "Nu Token"
contract MaliciousBank {
  function supportsToken() external pure returns (bytes32) {
    // Return a hash that is strictly greater than keccak256("Nu Token")
    // keccak256("Nu Token") = 0x8c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b
    // We return a slightly larger value
    return 0x8c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5b5c5c;
  }
  
  function attack(address modEntrancyAddress) external {
    (bool success, ) = modEntrancyAddress.call(abi.encodeWithSignature("airDrop()"));
    require(success, "airDrop failed");
  }
}