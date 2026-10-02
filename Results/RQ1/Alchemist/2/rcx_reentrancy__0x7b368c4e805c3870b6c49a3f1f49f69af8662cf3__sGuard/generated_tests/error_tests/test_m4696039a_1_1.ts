import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant test - block.timestamp >= acc.unlockTime", function () {
  it("should revert when Collect is called exactly at unlock time (original) but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Put exactly at current timestamp (unlockTime == block.timestamp)
    const putTx = await instance.connect(addr1).Put(currentTimestamp, { value: ethers.parseEther("2") });
    await putTx.wait();

    // Verify balance is set
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("2"));
    expect(holder.unlockTime).to.equal(currentTimestamp);

    // Try Collect exactly at unlockTime - should revert on original (strict >)
    // On mutant (>=) it would succeed, killing the mutant
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});