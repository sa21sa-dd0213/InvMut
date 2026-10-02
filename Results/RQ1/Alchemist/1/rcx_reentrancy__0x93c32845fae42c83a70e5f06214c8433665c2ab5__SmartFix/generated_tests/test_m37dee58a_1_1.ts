import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m37dee58a test", function () {
  it("should revert Collect when balance is greater than MinSum (mutant requires exact equality)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get the MinSum value (1 ether)
    const minSum = await instance.MinSum();

    // Deposit 2 ether (double MinSum) with a future unlock time
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(futureUnlockTime, { value: depositAmount });

    // Fast-forward time past the unlock time
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect 1 ether - should succeed on original but revert on mutant
    // because mutant requires balance == MinSum (exactly 1 ether) instead of >= MinSum
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});