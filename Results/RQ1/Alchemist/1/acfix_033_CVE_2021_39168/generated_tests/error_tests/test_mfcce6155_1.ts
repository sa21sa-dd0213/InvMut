import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mfcce6155 test", function () {
  it("should revert when targets.length < values.length in executeBatch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with minimum delay and proposers/executors
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Get the timelock contract address
    const timelockAddress = await instance.getAddress();
    
    // Prepare test data with mismatched lengths: 2 targets, 3 values
    const targets = [addr1.address, addr1.address];
    const values = [ethers.parseEther("1"), ethers.parseEther("2"), ethers.parseEther("3")];
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    
    // Schedule the operation first (need to use scheduleBatch for batch operations)
    // Calculate the operation id for the batch
    const operationId = await instance.hashOperationBatch(
      targets,
      values,
      datas,
      predecessor,
      salt
    );
    
    // Schedule the operation with proper delay
    const delay = minDelay + 100; // Ensure delay is sufficient
    await instance.scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      delay
    );
    
    // Wait for the delay period to pass
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to execute the batch - should revert due to length mismatch
    // The original requires targets.length == values.length
    // The mutant allows targets.length <= values.length
    await expect(
      instance.executeBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        { value: ethers.parseEther("6") } // Provide enough ETH for all values
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});