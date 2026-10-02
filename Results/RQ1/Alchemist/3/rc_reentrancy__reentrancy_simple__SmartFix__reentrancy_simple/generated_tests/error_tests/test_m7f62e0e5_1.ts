import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m7f62e0e5 test", function () {
  it("should allow withdrawal after depositing, but mutant reverts due to always-true condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).addToBalance({ value: depositAmount });

    // Check balance before withdrawal
    const balanceBefore = await instance.getBalance(addr1.address);
    expect(balanceBefore).to.equal(depositAmount);

    // Attempt withdrawal - should succeed on original, revert on mutant
    const tx = instance.connect(addr1).withdrawBalance();
    
    // The original would succeed, but mutant reverts because if(true) always triggers revert
    await expect(tx).to.be.reverted;

    // Verify balance remains unchanged (mutant reverts before updating)
    const balanceAfter = await instance.getBalance(addr1.address);
    expect(balanceAfter).to.equal(depositAmount);
  });
});