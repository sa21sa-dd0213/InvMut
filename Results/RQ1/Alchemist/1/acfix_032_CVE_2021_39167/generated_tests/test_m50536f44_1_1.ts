import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m50536f44 - scheduleBatch length check", function () {
  it("should revert when targets.length > datas.length (mutant would not revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with minimum delay of 1 second, one proposer, one executor
    const Factory = await ethers.getContractFactory("TimelockController");
    const minDelay = 1;
    const proposers = [owner.address];
    const executors = [owner.address];
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Prepare arrays where targets.length > datas.length
    const targets = [owner.address, addr1.address, owner.address]; // 3 targets
    const values = [0, 0, 0]; // 3 values
    const datas = ["0x", "0x"]; // 2 datas (length mismatch) - use hex strings
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 100;

    // This should revert in original (== check) but pass in mutant (>= check)
    await expect(
      timelock.connect(owner).scheduleBatch(targets, values, datas, predecessor, salt, delay)
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});