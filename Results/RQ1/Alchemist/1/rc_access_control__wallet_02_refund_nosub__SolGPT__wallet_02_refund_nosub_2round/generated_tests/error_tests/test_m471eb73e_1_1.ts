import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m471eb73e - withdraw restriction", function () {
  it("should kill mutant by withdrawing partial balance (mutant requires full balance withdrawal)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("100");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw only 30 wei (partial withdrawal)
    const partialWithdrawAmount = ethers.parseEther("30");
    
    // Original: should succeed; Mutant: should revert because amount != full balance
    await expect(
      instance.connect(addr1).withdraw(partialWithdrawAmount)
    ).to.be.reverted;
  });
});