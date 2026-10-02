import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - supportsToken modifier removal", function () {
  it("should revert when called from an EOA without supportsToken interface in the original, but succeed in mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ModifierEntrancy contract (no constructor arguments needed)
    const ModifierEntrancy = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancy.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Bank contract that the attacker can use to satisfy supportsToken
    const Bank = await ethers.getContractFactory("Bank");
    const bank = await Bank.deploy();
    await bank.waitForDeployment();
    
    // Test: An EOA (attacker) directly calling airDrop should revert in original
    // because the supportsToken modifier requires msg.sender to be a contract
    // with the correct supportsToken() function. In the mutant, this check is removed.
    await expect(
      instance.connect(attacker).airDrop()
    ).to.be.reverted;
    
    // Alternative: Test that calling from the Bank contract address works
    // This shows the original would work with a proper contract caller
    // We need to simulate the Bank contract calling airDrop
    // Since Bank doesn't have a function to call airDrop, we use a different approach:
    // The attacker deploys a simple attacker contract that implements supportsToken
    const AttackerContract = await ethers.getContractFactory("Bank");
    const attackerContract = await AttackerContract.deploy();
    await attackerContract.waitForDeployment();
    
    // Now call from the attacker contract's perspective - this should work in both
    // original and mutant (if attacker contract had a way to call airDrop)
    // But the key test is the EOA call above which should revert in original
  });
});