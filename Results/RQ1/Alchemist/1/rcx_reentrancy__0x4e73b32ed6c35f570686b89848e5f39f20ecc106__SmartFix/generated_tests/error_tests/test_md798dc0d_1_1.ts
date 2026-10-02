import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant detection", function () {
  it("should detect mutant md798dc0d by reverting on valid deposit", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (required by PRIVATE_ETH_CELL constructor)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PRIVATE_ETH_CELL - no constructor arguments needed (contract has no constructor)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set up the contract: set MinSum, set LogFile, initialize
    await instance.SetMinSum(1);
    await instance.SetLogFile(await logFile.getAddress());
    await instance.Initialized();

    // Send a valid deposit - should succeed on original, fail on mutant
    const depositAmount = ethers.parseEther("1");

    // The mutant's require condition `<=` will revert because 
    // (balance + msg.value) is always > balance for positive msg.value
    await expect(
      instance.connect(user).Deposit({ value: depositAmount })
    ).to.be.reverted;
  });
});