import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - executeBatch length validation", function () {
  it("should revert when targets.length < datas.length (original behavior), but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with minimum delay of 0 for testing, proposers and executors
    const minDelay = 0;
    const proposers = [owner.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Schedule an operation first so we can execute it
    const target = addr1.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 0;
    
    // Schedule the operation
    const scheduleTx = await instance.schedule(target, value, data, predecessor, salt, delay);
    await scheduleTx.wait();
    
    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Now try to execute with mismatched array lengths (targets.length < datas.length)
    // This should revert in original but pass in mutant
    const targets = [target]; // 1 target
    const values = [value];   // 1 value
    const datas = [data, data]; // 2 data arrays - this is the mismatch
    
    await expect(
      instance.executeBatch(targets, values, datas, predecessor, salt)
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});