import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m36b0aaa1 test", function () {
  it("should kill mutant by calling Collect with insufficient balance after unlock time", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // User puts some ether but less than MinSum (1 ether)
    const putAmount = ethers.parseEther("0.5");
    const unlockTime = Math.floor(Date.now() / 1000) + 100; // future unlock time
    await instance.connect(user).Put(unlockTime, { value: putAmount });

    // Advance time past unlock time
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine", []);

    // Try to collect more than balance (balance is 0.5, try to collect 0.6)
    const collectAmount = ethers.parseEther("0.6");

    // On original: should revert because acc.balance < _am (0.5 < 0.6)
    // On mutant: would succeed because block.timestamp > acc.unlockTime (condition is true due to ||)
    // We expect revert, so if it doesn't revert, the mutant is killed
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});