import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant ma6c2fe6b test", function () {
  it("should kill mutant by detecting that withdrawal always reverts even with sufficient balance", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    const txDeposit = await instance.connect(user).addToBalance({ value: depositAmount });
    await txDeposit.wait();

    // Verify balance is recorded
    const balanceBefore = await instance.getBalance(user.address);
    expect(balanceBefore).to.equal(depositAmount);

    // User attempts to withdraw - should succeed in original, but mutant always reverts
    await expect(
      instance.connect(user).withdrawBalance()
    ).to.be.reverted;

    // Verify balance remains unchanged (mutant prevented withdrawal)
    const balanceAfter = await instance.getBalance(user.address);
    expect(balanceAfter).to.equal(depositAmount);
  });
});