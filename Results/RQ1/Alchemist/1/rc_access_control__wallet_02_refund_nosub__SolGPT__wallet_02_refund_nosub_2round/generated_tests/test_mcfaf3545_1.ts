import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - mcfaf3545", function () {
  it("should allow withdrawal of amount less than balance in original, but mutant should revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 2 ether from addr1
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw 1 ether (less than balance)
    const withdrawAmount = ethers.parseEther("1");
    
    // On original: should succeed
    // On mutant (>=): should revert because 1 < 2
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});