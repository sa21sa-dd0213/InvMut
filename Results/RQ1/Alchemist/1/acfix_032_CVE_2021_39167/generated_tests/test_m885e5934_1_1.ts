import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - m885e5934", function () {
  it("should revert when executing with uncompleted predecessor (original behavior) but mutant allows it", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100; // 100 seconds delay
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Grant EXECUTOR_ROLE to executor
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    await timelock.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);
    
    // Schedule first operation (operation A)
    const targetA = executor.address;
    const valueA = 0;
    const dataA = "0x";
    const saltA = ethers.keccak256(ethers.toUtf8Bytes("saltA"));
    const predecessorA = ethers.ZeroHash;
    
    await timelock.connect(proposer).schedule(
      targetA, valueA, dataA, predecessorA, saltA, minDelay
    );
    
    const idA = await timelock.hashOperation(targetA, valueA, dataA, predecessorA, saltA);
    
    // Schedule second operation (operation B) that depends on operation A being done
    const targetB = executor.address;
    const valueB = 0;
    const dataB = "0x";
    const saltB = ethers.keccak256(ethers.toUtf8Bytes("saltB"));
    
    await timelock.connect(proposer).schedule(
      targetB, valueB, dataB, idA, saltB, minDelay
    );
    
    const idB = await timelock.hashOperation(targetB, valueB, dataB, idA, saltB);
    
    // Fast forward time past the delay for operation B
    await ethers.provider.send("evm_increaseTime", [minDelay + 10]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to execute operation B WITHOUT first executing operation A
    // Original contract should revert with "missing dependency"
    // Mutant should allow execution (fail to detect the dependency issue)
    await expect(
      timelock.connect(executor).execute(
        targetB, valueB, dataB, idA, saltB
      )
    ).to.be.revertedWith("TimelockController: missing dependency");
  });
});