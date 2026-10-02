import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - scheduleBatch length check", function () {
  it("should revert when targets.length < values.length in scheduleBatch", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy TimelockController with proposer and executor roles
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Prepare mismatched arrays: 2 targets but 3 values
    const targets = [executor.address, executor.address];
    const values = [0, 0, 0]; // 3 values vs 2 targets
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.zeroPadValue(ethers.toBeHex(1), 32);
    const delay = minDelay;

    // This should revert on original (targets.length == values.length) but pass on mutant (targets.length <= values.length)
    await expect(
      instance.connect(proposer).scheduleBatch(targets, values, datas, predecessor, salt, delay)
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});