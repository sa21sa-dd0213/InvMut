import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant detection - Collect function", function () {
  it("should revert on mutant when balance > MinSum (detects <= bug)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DEP_BANK (no constructor arguments needed based on contract)
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile separately (needed for Log.AddMessage)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set up the contract with LogFile and MinSum
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.SetMinSum(ethers.parseEther("10"));
    await instance.Initialized();

    // Fund addr1 with 20 ETH (balance > MinSum)
    await instance.connect(addr1).Deposit({ value: ethers.parseEther("20") });

    // Attempt to collect 5 ETH (valid amount, balance 20 >= MinSum 10 and >= 5)
    // Original: should succeed. Mutant: should revert because 20 <= 10 is false
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("5"))
    ).to.be.reverted;
  });
});