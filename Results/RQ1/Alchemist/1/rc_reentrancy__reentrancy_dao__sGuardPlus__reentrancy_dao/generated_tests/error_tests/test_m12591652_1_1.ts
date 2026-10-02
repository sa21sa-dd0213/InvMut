import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection test", function () {
  it("should detect removal of reentrancy guard by performing a reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the ReentrancyDAO contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Deploy the attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(dao.target);
    await attackerContract.waitForDeployment();
    
    // Fund the DAO with some ether
    await dao.connect(owner).deposit({ value: ethers.parseEther("10") });
    
    // Attacker deposits and then triggers withdrawAll via the malicious contract
    await dao.connect(attacker).deposit({ value: ethers.parseEther("1") });
    
    // The attacker contract calls withdrawAll, which will try to re-enter
    const tx = await attackerContract.connect(attacker).attack({ value: ethers.parseEther("0") });
    
    // On the original (with guard), this should revert. On the mutant (without guard), it will succeed
    // We expect the transaction to succeed on the mutant, proving the guard is missing
    await expect(tx).to.not.be.reverted;
    
    // Verify the attacker drained the entire balance
    const daoBalance = await ethers.provider.getBalance(dao.target);
    expect(daoBalance).to.equal(0n);
  });
});