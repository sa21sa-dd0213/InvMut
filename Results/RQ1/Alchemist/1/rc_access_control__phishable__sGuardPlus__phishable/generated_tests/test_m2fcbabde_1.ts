import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m2fcbabde - removed access control", function () {
  it("should revert when non-owner tries to withdrawAll", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contract with owner
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Fund the contract with some ether for withdrawal
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Record balance before attack
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const attackerBalanceBefore = await ethers.provider.getBalance(attacker.address);
    
    // Attempt withdrawal from unauthorized address - should revert in original, succeed in mutant
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
    
    // Verify no balance was transferred (kills mutant if withdrawal succeeded)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const attackerBalanceAfter = await ethers.provider.getBalance(attacker.address);
    
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
    expect(attackerBalanceAfter).to.equal(attackerBalanceBefore);
  });
});