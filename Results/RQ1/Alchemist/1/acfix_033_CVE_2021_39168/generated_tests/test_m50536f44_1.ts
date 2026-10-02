import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - scheduleBatch length check", function () {
  it("should revert when targets.length > datas.length", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    // Deploy with minimal delay and proposer role for owner
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address];
    const executors = [ethers.ZeroAddress]; // Open execution
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Prepare test data where targets.length > datas.length
    const targets = [proposer.address, proposer.address, proposer.address]; // 3 targets
    const values = [0, 0, 0];
    const datas = ["0x01", "0x02"]; // Only 2 data elements
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    // Grant PROPOSER_ROLE to owner so they can call scheduleBatch
    await instance.grantRole(await instance.PROPOSER_ROLE(), owner.address);
    
    // This should revert because targets.length (3) > datas.length (2)
    await expect(
      instance.connect(owner).scheduleBatch(
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