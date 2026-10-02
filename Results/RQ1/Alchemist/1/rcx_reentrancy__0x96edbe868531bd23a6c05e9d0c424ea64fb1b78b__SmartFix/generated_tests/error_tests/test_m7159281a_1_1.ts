import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m7159281a - Collect condition replaced with false", function () {
  it("should revert or do nothing when Collect is called with valid conditions, because the mutant replaces the entire condition with false", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY (no constructor args)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));

    // Set LogFile address
    await instance.SetLogFile(await logFile.getAddress());

    // Initialize the contract
    await instance.Initialized();

    // addr1 deposits 2 ether with lock time of 1 second
    await instance.connect(addr1).Put(1, { value: ethers.parseEther("2") });

    // Wait for lock time to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Try to collect 1 ether - this should succeed in the original but fail in the mutant
    const tx = instance.connect(addr1).Collect(ethers.parseEther("1"));

    // In the mutant, the condition is false, so the transfer never happens
    // The function will either revert or do nothing silently
    // We expect either a revert OR no balance change
    let reverted = false;
    try {
      await (await tx).wait();
    } catch (e) {
      reverted = true;
    }

    if (!reverted) {
      // If it didn't revert, the balance should not have changed (mutant behavior)
      const finalBalance = await ethers.provider.getBalance(addr1.address);
      expect(finalBalance).to.equal(initialBalance);
    } else {
      // If it reverted, that's also the mutant behavior (condition always false)
      expect(reverted).to.be.true;
    }

    // Additionally, verify that the contract still holds the full deposit
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("2"));
  });
});