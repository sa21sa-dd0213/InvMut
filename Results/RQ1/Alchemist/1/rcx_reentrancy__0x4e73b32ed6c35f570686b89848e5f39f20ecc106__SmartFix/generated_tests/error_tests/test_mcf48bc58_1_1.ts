import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test - mcf48bc58", function () {
  it("should kill mutant where Collect condition uses <= instead of >=", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (needed by PRIVATE_ETH_CELL)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PRIVATE_ETH_CELL (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("10"));
    await instance.connect(owner).Initialized();

    // User deposits 5 ETH (less than MinSum of 10)
    await instance.connect(user).Deposit({ value: ethers.parseEther("5") });

    // Verify balance is 5 ETH
    expect(await instance.balances(user.address)).to.equal(ethers.parseEther("5"));

    // In the ORIGINAL contract, this Collect call would revert because
    // balances[user] (5) < MinSum (10), so the >= condition fails.
    // In the MUTANT, the condition becomes <=, which is true (5 <= 10),
    // so the transaction would succeed - killing the mutant.
    await expect(
      instance.connect(user).Collect(ethers.parseEther("3"))
    ).to.be.reverted;
  });
});