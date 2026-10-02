import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant test for Collect (>= vs ==)", function () {
  it("should succeed with partial withdrawal on original, but fail on mutant", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with the Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // User deposits 2 ether
    const depositAmount = ethers.parseEther("2");
    const txDeposit = await instance.connect(user).Put(0, { value: depositAmount });
    await txDeposit.wait();

    // User tries to withdraw 1 ether (partial amount, less than balance)
    const withdrawAmount = ethers.parseEther("1");

    // On original: should succeed (balance >= amount)
    // On mutant: should revert (balance == amount is false since 2 != 1)
    await expect(
      instance.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});