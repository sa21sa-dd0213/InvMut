import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection", function () {
  it("should kill mutant m1fd90faa by triggering out-of-bounds access in scheduleBatch", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with proposer and executor roles
    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Prepare arrays for scheduleBatch with 2 elements
    const targets = [owner.address, owner.address];
    const values = [0, 0];
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    // This call should succeed on original but fail on mutant due to <= causing out-of-bounds access
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.be.reverted; // The mutant will revert due to array index out of bounds
  });
});