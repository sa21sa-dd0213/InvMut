import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - scheduleBatch length check", function () {
  it("should revert when targets.length > values.length on original contract (detect mutant with >= instead of ==)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with minimum delay of 1 second, one proposer and one executor
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Setup: grant PROPOSER_ROLE to proposer (already done in constructor)
    // Create arrays where targets.length > values.length (3 targets, 2 values)
    const targets = [executor.address, executor.address, executor.address];
    const values = [0, 0];
    const datas = ["0x", "0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;

    // This should revert because targets.length (3) != values.length (2)
    // Original contract requires ==, mutant allows >=
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});