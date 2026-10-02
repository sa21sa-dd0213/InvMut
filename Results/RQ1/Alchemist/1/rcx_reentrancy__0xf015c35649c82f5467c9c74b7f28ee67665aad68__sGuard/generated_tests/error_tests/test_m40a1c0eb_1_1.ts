import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m40a1c0eb test", function () {
  it("should revert when trying to Collect with insufficient balance or before unlock time", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const bank = await Factory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Test case: attempt to Collect with zero balance (should revert in original)
    // In mutant with if(true), this would succeed incorrectly
    await expect(
      bank.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Another scenario: deposit some ETH but try to collect before unlock time
    const depositAmount = ethers.parseEther("2");
    await bank.connect(addr1).Put(0, { value: depositAmount });

    // Try to collect more than deposited (should revert)
    await expect(
      bank.connect(addr1).Collect(ethers.parseEther("5"))
    ).to.be.reverted;

    // Try to collect before unlock time (set unlock time far in future)
    const futureTime = Math.floor(Date.now() / 1000) + 100000;
    await bank.connect(addr1).Put(futureTime, { value: depositAmount });

    // This should revert because unlock time hasn't passed
    await expect(
      bank.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});