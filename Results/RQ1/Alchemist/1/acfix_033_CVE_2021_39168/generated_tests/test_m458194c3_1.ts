import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m458194c3 - scheduleBatch length check", function () {
  it("should revert when datas.length > targets.length (original behavior)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer for scheduling
    const timelockAdminRole = await instance.TIMELOCK_ADMIN_ROLE();
    await instance.connect(owner).grantRole(timelockAdminRole, proposer.address);
    const proposerRole = await instance.PROPOSER_ROLE();
    await instance.connect(owner).grantRole(proposerRole, proposer.address);
    
    // Prepare arrays where targets.length < datas.length
    const targets = [executor.address]; // 1 element
    const values = [ethers.parseEther("0")]; // 1 element
    const datas = [ethers.utils.formatBytes32String("data1"), ethers.utils.formatBytes32String("data2")]; // 2 elements
    const predecessor = ethers.constants.HashZero;
    const salt = ethers.constants.HashZero;
    const delay = minDelay + 100;
    
    // This should revert on original (== check) but pass on mutant (<= check)
    await expect(
      instance.connect(proposer).scheduleBatch(targets, values, datas, predecessor, salt, delay)
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});