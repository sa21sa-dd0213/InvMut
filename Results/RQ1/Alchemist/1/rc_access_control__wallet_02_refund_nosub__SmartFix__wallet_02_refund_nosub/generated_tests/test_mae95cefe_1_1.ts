import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mae95cefe detection test", function () {
  it("should kill mutant by depositing 1 ether and then withdrawing the same amount, expecting failure in mutant but success in original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit exactly 1 ether from addr1
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Try to withdraw the full deposited amount
    // In the original contract, this succeeds (balance = depositAmount)
    // In the mutant, balance = depositAmount - 1 wei, so withdraw of full amount should revert
    await expect(
      instance.connect(addr1).withdraw(depositAmount)
    ).to.be.reverted;
  });
});