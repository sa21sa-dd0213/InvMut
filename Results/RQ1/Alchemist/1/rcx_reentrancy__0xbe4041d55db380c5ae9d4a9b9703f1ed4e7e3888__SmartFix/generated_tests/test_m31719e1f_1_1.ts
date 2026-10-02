import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m31719e1f test", function () {
  it("should detect mutant where >= MinSum is replaced with == MinSum", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Deploy a Log contract to satisfy the LogFile requirement
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize the contract
    await moneyBox.setLogFile(await log.getAddress());
    await moneyBox.setMinSum(ethers.parseEther("10"));
    await moneyBox.initialized();

    // User deposits 15 ether (balance = 15, MinSum = 10)
    await moneyBox.connect(user).put(0, { value: ethers.parseEther("15") });

    // User tries to collect 5 ether
    // Original: balance(15) >= MinSum(10) passes → collect succeeds
    // Mutant:  balance(15) == MinSum(10) fails → transaction reverts
    await expect(
      moneyBox.connect(user).collect(ethers.parseEther("5"))
    ).to.be.reverted;
  });
});