import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - executeBatch off-by-one", function () {
  it("should revert on executeBatch with non-empty arrays due to off-by-one in mutant", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy TimelockController with proposers and executors
    const minDelay = 3600; // 1 hour
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],  // proposers
      [executor.address]   // executors
    );
    await instance.waitForDeployment();

    // Prepare a simple call - e.g., transfer 0 ETH to a random address
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // Schedule the operation first (as proposer)
    const scheduleTx = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    await scheduleTx.wait();

    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Prepare batch arrays with one element (non-empty)
    const targets = [target];
    const values = [value];
    const datas = [data];

    // Execute batch as executor - this should revert on mutant due to i <= targets.length
    // causing array index out of bounds when i == targets.length (i.e., index 1 out of bounds for length 1)
    await expect(
      instance.connect(executor).executeBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        { value: 0 }
      )
    ).to.be.reverted;
  });
});