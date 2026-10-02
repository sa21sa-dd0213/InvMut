import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant me2ec2209", function () {
  it("should revert when unauthorized address calls execute with non-open executor role", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with no executors (only owner gets TIMELOCK_ADMIN_ROLE)
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      3600, // minDelay (1 hour)
      [],   // proposers (empty)
      []    // executors (empty)
    );
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to owner so we can schedule
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    
    await instance.connect(owner).grantRole(PROPOSER_ROLE, owner.address);
    
    // Schedule an operation
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = 3600;
    
    await instance.connect(owner).schedule(target, value, data, predecessor, salt, delay);
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    
    // Verify that EXECUTOR_ROLE is NOT open (not granted to address(0))
    expect(await instance.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress)).to.be.false;
    
    // Attempt to execute from unauthorized address - should revert on original but pass on mutant
    await expect(
      instance.connect(attacker).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.reverted;
  });
});