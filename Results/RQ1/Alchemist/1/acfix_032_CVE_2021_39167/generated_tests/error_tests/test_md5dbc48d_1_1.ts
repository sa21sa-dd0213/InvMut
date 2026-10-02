import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - hashOperationBatch", function () {
  it("should detect mutant that removes return in hashOperationBatch", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    
    // Constructor args: minDelay, proposers, executors
    const minDelay = 3600; // 1 hour in seconds
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];
    
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Prepare batch call parameters
    const targets: string[] = [owner.address];
    const values: bigint[] = [ethers.parseEther("0")];
    const datas: string[] = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // Compute expected hash off-chain (same way contract does it)
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address[]", "uint256[]", "bytes[]", "bytes32", "bytes32"],
      [targets, values, datas, predecessor, salt]
    );
    const expectedHash = ethers.keccak256(encoded);

    // Call hashOperationBatch - original returns the hash, mutant returns nothing (default 0x0...0)
    const returnedHash = await instance.hashOperationBatch(
      targets,
      values,
      datas,
      predecessor,
      salt
    );

    // Assert that the returned hash matches the expected hash
    // The mutant will fail this assertion because it returns bytes32(0) instead of the actual hash
    expect(returnedHash).to.equal(expectedHash);
  });
});