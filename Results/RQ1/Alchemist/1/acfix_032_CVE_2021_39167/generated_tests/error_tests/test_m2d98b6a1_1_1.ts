import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - scheduleBatch length mismatch", function () {
  it("should revert when targets and values arrays have different lengths", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with minimum delay and proposers/executors
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Create arrays with mismatched lengths
    const targets = [addr1.address, addr2.address]; // 2 targets
    const values = [ethers.parseEther("1.0")]; // 1 value - mismatch!
    const datas = [ethers.randomBytes(32), ethers.randomBytes(32)]; // 2 data entries
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    
    // This should revert due to length mismatch check
    await expect(
      instance.connect(owner).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        minDelay
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});