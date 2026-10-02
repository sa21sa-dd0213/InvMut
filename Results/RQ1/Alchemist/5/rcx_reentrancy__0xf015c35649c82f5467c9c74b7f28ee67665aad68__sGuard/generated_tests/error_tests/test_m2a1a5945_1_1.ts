import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m2a1a5945 test", function () {
  it("should kill the mutant by testing that block.timestamp (not block.prevrandao) controls unlock time", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Set a future unlock time (e.g., 1 hour from now)
    const futureTime = Math.floor(Date.now() / 1000) + 3600;

    // Deposit 2 ether to satisfy MinSum (1 ether) and have balance for withdrawal
    await instance.connect(addr1).Put(futureTime, { value: ethers.parseEther("2") });

    // Wait until the future time has passed
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureTime + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt to collect 1 ether - should succeed on original but fail on mutant
    // because block.prevrandao will NOT be > future unlock time
    const tx = instance.connect(addr1).Collect(ethers.parseEther("1"));

    // The mutant will revert because block.prevrandao is not time-based
    await expect(tx).to.be.reverted;
  });
});