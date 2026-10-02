import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - mccf6f859", function () {
  it("should revert when executing an operation that fails, because _call must validate success", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy TimelockController with proposer and executor roles
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      3600, // minDelay: 1 hour
      [proposer.address], // proposers
      [executor.address]  // executors
    );
    await instance.waitForDeployment();

    // Grant TIMELOCK_ADMIN_ROLE to executor for _afterCall to succeed
    const TIMELOCK_ADMIN_ROLE = await instance.TIMELOCK_ADMIN_ROLE();
    await instance.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, executor.address);

    // Deploy a simple target contract that will always revert
    const TargetFactory = await ethers.getContractFactory("RevertingTarget");
    const target = await TargetFactory.deploy();
    await target.waitForDeployment();

    // Prepare operation data - call the reverting function
    const value = ethers.parseEther("0");
    const data = target.interface.encodeFunctionData("alwaysRevert");
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 3600;

    // Schedule the operation as proposer
    await instance.connect(proposer).schedule(
      await target.getAddress(),
      value,
      data,
      predecessor,
      salt,
      delay
    );

    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Execute should revert because underlying call fails
    // In the original contract, _call requires success, so this reverts
    // In the mutant, the require is removed, so it would succeed silently
    await expect(
      instance.connect(executor).execute(
        await target.getAddress(),
        value,
        data,
        predecessor,
        salt,
        { value: 0 }
      )
    ).to.be.revertedWith("TimelockController: underlying transaction reverted");
  });
});