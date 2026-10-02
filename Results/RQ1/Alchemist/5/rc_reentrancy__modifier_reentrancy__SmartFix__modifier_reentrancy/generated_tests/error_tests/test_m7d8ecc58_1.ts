import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - reentrancy guard removal", function () {
  it("should detect removal of _nonReentrant modifier by allowing reentrant call", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy (no constructor arguments)
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const modEntrancy = await ModifierEntrancy.deploy();
    await modEntrancy.waitForDeployment();
    
    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousContract = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousContract.deploy(await modEntrancy.getAddress());
    await malicious.waitForDeployment();
    
    // First, fund attacker with some ETH to deploy and interact (optional)
    // The malicious contract will call airDrop and then re-enter
    
    // Execute the attack
    await malicious.connect(attacker).attack();
    
    // Check that the attacker's token balance was increased multiple times
    // In the original contract with _nonReentrant, it should revert
    // In the mutant without _nonReentrant, the balance will be > 20
    const attackerBalance = await modEntrancy.tokenBalance(await malicious.getAddress());
    expect(attackerBalance).to.equal(40); // Should be 40 if reentrant call succeeded
  });
});

// Helper contract for reentrancy attack
// This must be deployed in the same file or as a separate contract
// For simplicity, we define it as a Hardhat contract factory