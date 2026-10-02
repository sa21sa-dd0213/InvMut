import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - hashOperationBatch", function () {
  it("should detect mutant that replaces keccak256 with sha256 in hashOperationBatch", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 100; // 100 seconds delay
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Grant executor role to the timelock itself to enable _afterCall
    await instance.connect(owner).grantRole(
      await instance.EXECUTOR_ROLE(),
      await instance.getAddress()
    );

    // Setup batch operation parameters
    const targets = [executor.address];
    const values = [ethers.parseEther("0")];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // Schedule the batch operation
    await instance.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      minDelay
    );

    // Compute the expected operation ID using the original keccak256 hash
    const expectedId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address[]", "uint256[]", "bytes[]", "bytes32", "bytes32"],
        [targets, values, datas, predecessor, salt]
      )
    );

    // Verify the operation is pending with the correct ID
    expect(await instance.isOperationPending(expectedId)).to.be.true;

    // Fast forward time to make the operation ready
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to execute - on the original this should work,
    // on the mutant (with sha256) the hash won't match and it should revert
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