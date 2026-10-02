import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m68e0927f test", function () {
  it("should detect mutant by allowing Collect when balance is less than MinSum but >= _am and time is after unlockTime", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const MinSum = ethers.parseEther("1");

    // User puts exactly 0.5 ether (less than MinSum of 1 ether)
    const putAmount = ethers.parseEther("0.5");
    const unlockTime = Math.floor(Date.now() / 1000) + 1000; // Future unlock time

    // Put funds with future unlock time
    await instance.connect(user).Put(unlockTime, { value: putAmount });

    // Advance time past unlockTime
    await ethers.provider.send("evm_increaseTime", [1001]);
    await ethers.provider.send("evm_mine");

    // Try to collect 0.3 ether (less than balance of 0.5 ether, but less than MinSum)
    const collectAmount = ethers.parseEther("0.3");

    // In the original contract this should revert because balance (0.5) < MinSum (1)
    // In the mutant it succeeds because: balance >= _am (0.5 >= 0.3) AND time > unlockTime
    // This kills the mutant by detecting unintended behavior
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});