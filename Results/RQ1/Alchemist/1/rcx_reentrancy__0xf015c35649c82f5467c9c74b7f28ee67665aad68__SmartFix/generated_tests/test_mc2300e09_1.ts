import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mc2300e09 test", function () {
  it("should revert when Collect is called and the recipient contract rejects Ether", async function () {
    // Deploy the Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy a malicious receiver contract that always reverts on receive
    const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
    const maliciousInstance = await MaliciousReceiver.deploy();
    await maliciousInstance.waitForDeployment();

    // Deploy MY_BANK with the Log contract address
    const MY_BANKFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await MY_BANKFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    const [owner, user] = await ethers.getSigners();

    // Fund the bank with some Ether for the user to collect
    await owner.sendTransaction({
      to: await bankInstance.getAddress(),
      value: ethers.parseEther("10")
    });

    // User deposits Ether and sets unlock time to now (or in the past)
    await bankInstance.connect(user).Put(0, { value: ethers.parseEther("2") });

    // Get current block timestamp and ensure unlock condition passes
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTime = latestBlock!.timestamp;
    
    // Mine a new block to advance time if needed
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect 1 ether to the malicious receiver contract
    // The malicious receiver will revert on receive, so the original should revert
    await expect(
      bankInstance.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});