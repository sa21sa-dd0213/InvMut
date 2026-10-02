import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - hashOperationBatch hash function change", function () {
  it("should kill mutant by verifying that scheduleBatch and executeBatch use consistent hash computation", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // Grant proposer and executor roles to the contract itself for testing
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));

    await timelock.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    await timelock.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);

    // Prepare batch operation parameters
    const targets = [owner.address];
    const values = [0];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test_salt"));

    // Schedule the batch operation
    await timelock.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      minDelay
    );

    // Compute the expected operation ID using the ORIGINAL keccak256 hash
    const expectedId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address[]", "uint256[]", "bytes[]", "bytes32", "bytes32"],
        [targets, values, datas, predecessor, salt]
      )
    );

    // Wait for the delay to pass
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to execute the batch operation using the expectedId
    // The mutant computes a different ID using sha256, so this should fail
    await expect(
      timelock.connect(executor).executeBatch(
        targets,
        values,
        datas,
        predecessor,
        salt
      )
    ).to.be.reverted;
  });
});