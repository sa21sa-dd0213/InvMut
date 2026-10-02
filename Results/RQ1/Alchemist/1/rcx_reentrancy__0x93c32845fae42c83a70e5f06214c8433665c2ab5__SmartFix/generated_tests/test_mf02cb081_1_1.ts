import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - mf02cb081", function () {
  it("should revert when Collect is called with amount greater than balance, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // First, make a deposit from addr1 to have some balance
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Try to collect more than deposited - should revert in original
    // but mutant would allow it since condition is replaced with true
    const withdrawAmount = ethers.parseEther("5");
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });

  it("should revert when Collect is called before unlock time, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deposit with a future unlock time
    const depositAmount = ethers.parseEther("2");
    const futureUnlock = Math.floor(Date.now() / 1000) + 100000; // far in the future
    await instance.connect(addr1).Put(futureUnlock, { value: depositAmount });

    // Try to collect before unlock time - should revert in original
    // but mutant would allow it
    const withdrawAmount = ethers.parseEther("1");
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });

  it("should revert when Collect is called with balance below MinSum, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deposit a very small amount (less than 1 ether MinSum)
    const depositAmount = ethers.parseEther("0.5");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Try to collect - should revert because balance < MinSum
    // but mutant would allow it
    const withdrawAmount = ethers.parseEther("0.1");
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});