import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - m7e788696", function () {
  it("should revert when user with zero credit calls withdrawAll on original, but succeed on mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get initial balance of attacker
    const initialBalance = await ethers.provider.getBalance(attacker.address);
    
    // Attacker has never deposited, so their credit is 0
    // On the original contract, this should revert because oCredit > 0 is false
    // On the mutant, this should succeed because condition is always true
    
    // Try to call withdrawAll from attacker (zero credit account)
    const tx = instance.connect(attacker).withdrawAll();
    
    // The original contract would revert because the require(callResult) would fail
    // when trying to send 0 ether (or the call would succeed with 0 value)
    // Either way, the state should not change on the original
    
    // We expect the transaction to revert on the original contract
    await expect(tx).to.be.reverted;
    
    // Verify attacker's balance hasn't changed (no ether was sent)
    expect(await ethers.provider.getBalance(attacker.address)).to.equal(initialBalance);
  });
});