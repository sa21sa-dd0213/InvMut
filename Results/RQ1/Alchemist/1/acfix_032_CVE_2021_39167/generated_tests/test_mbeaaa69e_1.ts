import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - mbeaaa69e", function () {
  it("should revert when targets and datas lengths are equal (mutant expects them to be different)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant executor role to address(0) to allow open execution (matching onlyRoleOrOpenRole modifier)
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    const timelockAdminRole = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
    
    // First schedule a batch operation with matching array lengths
    const targets = [executor.address];
    const values = [ethers.parseEther("0")];
    const datas = [ethers.toUtf8Bytes("0x")]; // same length as targets
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    
    // Schedule the operation
    await instance.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      minDelay
    );
    
    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to execute - should succeed on original but fail on mutant
    // because mutant requires targets.length != datas.length
    await expect(
      instance.connect(executor).executeBatch(
        targets,
        values,
        datas,
        predecessor,
        salt
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});