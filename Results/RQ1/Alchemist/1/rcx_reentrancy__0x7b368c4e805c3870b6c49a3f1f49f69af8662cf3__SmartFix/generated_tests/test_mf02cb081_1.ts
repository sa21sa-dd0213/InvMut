import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mf02cb081 - kill with insufficient balance and unlock time", function () {
  it("should revert when trying to collect before unlock time with balance below MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deposit a small amount (less than MinSum = 1 ether)
    const depositAmount = ethers.parseEther("0.5");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Try to collect the same amount before any unlock time has passed
    // On original: should revert because balance < MinSum OR block.timestamp <= unlockTime
    // On mutant: will succeed (incorrectly)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});