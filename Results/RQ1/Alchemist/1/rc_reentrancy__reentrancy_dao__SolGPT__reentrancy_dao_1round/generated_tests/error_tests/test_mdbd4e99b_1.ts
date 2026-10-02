import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should kill mutant mdbd4e99b by detecting credit/balance mismatch", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    await instance.connect(owner).deposit({ value: depositAmount });

    // Withdraw all - should succeed on original, fail on mutant
    await expect(instance.connect(owner).withdrawAll()).to.not.be.reverted;

    // Check final balance is zero after withdrawal
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});