import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test", function () {
  it("should revert when executeBatch is called with equal-length arrays (mutant uses != instead of ==)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with proposer and executor roles
    const minDelay = 3600; // 1 hour in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Grant EXECUTOR_ROLE to executor
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);

    // Schedule a batch operation first (as proposer)
    const targets = [owner.address, owner.address];
    const values = [0, 0];
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    
    await instance.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      minDelay
    );

    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Execute batch - this should revert on the mutant because arrays have equal length
    // Original contract: requires targets.length == datas.length (passes)
    // Mutant: requires targets.length != datas.length (reverts because they ARE equal)
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