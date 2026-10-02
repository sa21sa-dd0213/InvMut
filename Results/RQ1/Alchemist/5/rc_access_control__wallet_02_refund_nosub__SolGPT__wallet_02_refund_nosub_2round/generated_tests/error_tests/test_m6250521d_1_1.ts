import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when withdrawing more than balance (mutant kills require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit some funds to addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw more than deposited
    const withdrawAmount = ethers.parseEther("2.0");
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});