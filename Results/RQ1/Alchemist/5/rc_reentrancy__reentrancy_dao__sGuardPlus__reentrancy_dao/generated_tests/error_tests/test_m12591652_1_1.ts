import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m12591652 test", function () {
  it("should detect removal of reentrancy guard by performing a reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Deploy attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await dao.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the DAO with some ETH
    const depositAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await dao.getAddress(),
      value: depositAmount
    });
    
    // Also deposit from the attacker to get credit
    const attackerCredit = ethers.parseEther("1");
    await attackerContract.connect(attacker).deposit({ value: attackerCredit });
    
    // Get initial balance of DAO
    const initialBalance = await ethers.provider.getBalance(await dao.getAddress());
    
    // Perform the reentrancy attack
    const tx = await attackerContract.connect(attacker).attack({ gasLimit: 1000000 });
    
    // The test should revert on original (with guard) but succeed on mutant
    // Since we're testing the mutant, we expect it to succeed (kill the mutant)
    // But to make the test meaningful, we check that the attacker stole more than allowed
    await expect(tx).to.not.be.reverted;
    
    const finalBalance = await ethers.provider.getBalance(await dao.getAddress());
    const attackerBalance = await ethers.provider.getBalance(attacker.address);
    
    // The attacker should have drained more than their credit if reentrancy succeeded
    // Original would prevent this, mutant allows it
    expect(finalBalance).to.be.lt(initialBalance - attackerCredit);
  });
});