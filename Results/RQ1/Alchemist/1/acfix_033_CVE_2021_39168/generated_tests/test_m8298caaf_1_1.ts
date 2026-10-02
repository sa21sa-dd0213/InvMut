import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController - Kill mutant m8298caaf (isOperationPending >=)", function () {
  it("should return false for executed operations (timestamp = 1) when calling isOperationPending", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Grant executor role to the executor signer
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);

    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, minDelay);

    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Execute the operation
    await instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });

    // Now the operation should be done (timestamp = 1)
    // The original contract returns false for isOperationPending
    // The mutant would return true because it uses >= instead of >
    const isPending = await instance.isOperationPending(id);
    expect(isPending).to.equal(false);
  });
});