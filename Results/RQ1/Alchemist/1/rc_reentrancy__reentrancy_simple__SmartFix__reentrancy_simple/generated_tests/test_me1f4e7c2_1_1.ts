import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - me1f4e7c2", function () {
  it("should revert when depositing non-zero amount to an address with zero balance (kills mutant with subtraction)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for Reentrance)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner has 0 balance
    expect(await instance.getBalance(owner.address)).to.equal(0);

    // Attempt to deposit 1 ether - should pass on original, fail on mutant
    // because mutant checks: (0 - 1 ether) >= 0 which is false
    const depositAmount = ethers.parseEther("1");
    const tx = instance.connect(owner).addToBalance({ value: depositAmount });
    
    // On the original, this would succeed; on the mutant, it should revert
    await expect(tx).to.be.reverted;
  });
});