import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m4696039a", function () {
  it("should kill mutant by testing exact unlock time boundary", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block.timestamp;

    // Set unlock time exactly equal to current timestamp
    const unlockTime = currentTimestamp;

    // User puts 2 ether with exact unlock time
    const putTx = await instance.connect(user).Put(unlockTime, { value: ethers.parseEther("2") });
    await putTx.wait();

    // Attempt to collect 1 ether at the exact same timestamp
    // In original: fails because block.timestamp > unlockTime is false (they are equal)
    // In mutant: succeeds because block.timestamp >= unlockTime is true
    await expect(
      instance.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});