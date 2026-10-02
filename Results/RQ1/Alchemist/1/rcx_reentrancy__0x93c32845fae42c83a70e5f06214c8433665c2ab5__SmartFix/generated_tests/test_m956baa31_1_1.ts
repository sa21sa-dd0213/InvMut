import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - m956baa31", function () {
  it("should kill the mutant by calling Put with zero msg.value on an account with existing balance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with the Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // First deposit some ether to create a positive balance
    const depositAmount = ethers.parseEther("1");
    await (await instance.connect(addr1).Put(0, { value: depositAmount })).wait();

    // Now try to call Put with zero msg.value - should revert in mutant, pass in original
    await expect(
      instance.connect(addr1).Put(0, { value: 0 })
    ).to.be.reverted;
  });
});