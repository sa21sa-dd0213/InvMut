import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test", function () {
  it("should detect mutant me82fe1a2 - scheduleBatch loop condition change", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with minimum delay of 1 second
    const minDelay = 1;
    const proposers = [owner.address];
    const executors = [owner.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Prepare batch operation with one target
    const targets = [addr1.address];
    const values = [ethers.parseEther("0.1")];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 100; // Use a delay >= minDelay

    // Schedule the batch
    const tx = await instance.scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      delay
    );
    await tx.wait();

    // Compute the operation ID
    const id = await instance.hashOperationBatch(
      targets,
      values,
      datas,
      predecessor,
      salt
    );

    // In the original contract, the operation should be pending
    // In the mutant (i > targets.length), the loop never executes,
    // so _schedule is never called, and isOperationPending should return false
    const isPending = await instance.isOperationPending(id);

    // The original contract would have this as true
    // The mutant would have this as false, killing the test
    expect(isPending).to.equal(true);
  });
});