import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m471eb73e - withdraw == instead of <=", function () {
  it("should allow partial withdrawal on original but revert on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw only 0.5 ether (partial withdrawal)
    const partialWithdraw = ethers.parseEther("0.5");
    
    // This should revert on the mutant because amount (0.5) != balance (1.0)
    // but would succeed on the original where amount <= balance is allowed
    await expect(
      instance.connect(addr1).withdraw(partialWithdraw)
    ).to.be.reverted;
  });
});