import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - maaae0441", function () {
  it("should revert Collect when balance is less than MinSum and unlock time not reached", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MONEY_BOX - no constructor arguments needed
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Set up the contract
    await moneyBox.SetMinSum(ethers.parseEther("10"));
    await moneyBox.SetLogFile(await logInstance.getAddress());
    await moneyBox.Initialized();

    // addr1 puts 1 ETH (less than MinSum of 10 ETH)
    const putTx = await moneyBox.connect(addr1).Put(100, { value: ethers.parseEther("1") });
    await putTx.wait();

    // Try to collect 1 ETH before unlock time (block.timestamp + 100 seconds)
    // In original: should revert because balance (1 ETH) < MinSum (10 ETH) AND block.timestamp <= unlockTime
    // In mutant: will succeed because condition is replaced with true
    await expect(
      moneyBox.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});