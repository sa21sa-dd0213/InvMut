import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m6250521d test", function () {
  it("should revert when withdrawing more than balance (kills mutant that removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit some ether to addr1's account
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw more than the deposited amount
    const excessiveWithdraw = ethers.parseEther("2.0");
    await expect(
      instance.connect(addr1).withdraw(excessiveWithdraw)
    ).to.be.reverted;
  });
});