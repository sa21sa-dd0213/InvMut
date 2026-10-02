import { expect } from "chai";
import { ethers } } from "hardhat";

describe("TimelockController mutant mdabff2e9 test", function () {
  it("should revert when executing with a non-zero predecessor that is not done", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with proposer and executor roles
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Create a target contract for testing (simple receiver)
    const ReceiverFactory = await ethers.getContractFactory("TimelockController");
    const receiver = await ReceiverFactory.deploy(1, [], []);
    await receiver.waitForDeployment();
    
    // Proposer schedules an operation with a non-zero predecessor that hasn't been done
    const target = receiver.address;
    const value = 0;
    const data = "0x";
    const nonExistentPredecessor = ethers.keccak256(ethers.toUtf8Bytes("non-existent-operation"));
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    // Schedule the operation via proposer
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      nonExistentPredecessor,
      salt,
      delay
    );
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute should revert because the predecessor doesn't exist (is not done)
    // The original contract requires predecessor == 0 OR isOperationDone(predecessor)
    // The mutant incorrectly allows any predecessor because bytes32(0) is the minimum
    await expect(
      timelock.connect(executor).execute(
        target,
        value,
        data,
        nonExistentPredecessor,
        salt,
        { value: 0 }
      )
    ).to.be.revertedWith("TimelockController: missing dependency");
  });
});