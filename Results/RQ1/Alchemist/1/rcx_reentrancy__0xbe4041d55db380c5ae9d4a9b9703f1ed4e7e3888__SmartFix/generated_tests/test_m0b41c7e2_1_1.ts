import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m0b41c7e2 - block.prevrandao vs block.timestamp", function () {
  it("should revert Collect when block.prevrandao is less than unlockTime, but original would succeed with block.timestamp", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy Log contract (no constructor arguments)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.01"));
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();

    // User puts 1 ETH with a 1-second lock time
    const putAmount = ethers.parseEther("1");
    await instance.connect(user).Put(1, { value: putAmount });

    // Wait for the unlock time to pass (block.timestamp > unlockTime)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Get current block info to verify condition
    const block = await ethers.provider.getBlock("latest");
    console.log("Current block timestamp:", block.timestamp);
    console.log("block.prevrandao:", block.prevrandao);

    // Attempt to collect - should revert on mutant because block.prevrandao is 0 or unrelated
    // On original contract this would succeed since block.timestamp > unlockTime
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });

  it("should succeed on original contract when block.timestamp > unlockTime", async function () {
    const [owner, user] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    await instance.connect(owner).SetMinSum(ethers.parseEther("0.01"));
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();

    await instance.connect(user).Put(1, { value: ethers.parseEther("1") });

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // This would succeed on original, but we expect revert on mutant
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});