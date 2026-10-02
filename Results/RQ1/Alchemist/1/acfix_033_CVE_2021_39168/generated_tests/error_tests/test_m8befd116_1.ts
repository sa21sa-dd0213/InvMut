import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m8befd116", function () {
  it("should kill mutant by showing that updateDelay fails due to sha256 vs keccak256 mismatch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with proposers and executors arrays (can be empty for this test)
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      3600, // minDelay: 1 hour
      [],   // proposers: empty array
      [owner.address] // executors: owner is executor
    );
    await instance.waitForDeployment();

    // Get the TIMELOCK_ADMIN_ROLE constant from the contract
    const TIMELOCK_ADMIN_ROLE = await instance.TIMELOCK_ADMIN_ROLE();
    
    // Grant PROPOSER_ROLE to owner so we can schedule operations
    const PROPOSER_ROLE = await instance.PROPOSER_ROLE();
    await instance.grantRole(PROPOSER_ROLE, owner.address);
    
    // Grant EXECUTOR_ROLE to address(0) to allow open execution
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);

    // Schedule an operation that calls updateDelay with a new delay
    const newDelay = 7200;
    const calldata = instance.interface.encodeFunctionData("updateDelay", [newDelay]);
    
    // Create the operation hash
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const predecessor = ethers.ZeroHash;
    const value = 0;
    
    const operationId = await instance.hashOperation(
      await instance.getAddress(),
      value,
      calldata,
      predecessor,
      salt
    );

    // Schedule the operation with sufficient delay
    const delay = 3600;
    await instance.schedule(
      await instance.getAddress(),
      value,
      calldata,
      predecessor,
      salt,
      delay
    );

    // Increase time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to execute - this should revert in the mutant because _afterCall checks
    // hasRole(TIMELOCK_ADMIN_ROLE, msg.sender) but the TIMELOCK_ADMIN_ROLE was computed
    // with sha256 during construction, while _afterCall uses keccak256 implicitly
    await expect(
      instance.execute(
        await instance.getAddress(),
        value,
        calldata,
        predecessor,
        salt,
        { value: 0 }
      )
    ).to.be.reverted;
  });
});