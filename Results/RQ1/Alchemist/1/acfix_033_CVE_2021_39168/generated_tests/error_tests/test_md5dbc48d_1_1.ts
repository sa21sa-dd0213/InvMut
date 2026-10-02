import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant md5dbc48d - hashOperationBatch return value", function () {
  it("should return correct non-zero hash for valid batch operation inputs", async function () {
    const [owner] = await ethers.getSigners();
    const minDelay = 86400; // 1 day in seconds
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    const targets = [owner.address];
    const values = [0];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    const hash = await instance.hashOperationBatch(
      targets,
      values,
      datas,
      predecessor,
      salt
    );

    // Verify that the returned hash is non-zero (mutant would return bytes32(0))
    expect(hash).to.not.equal(ethers.ZeroHash);
    
    // Additionally verify it matches the expected keccak256 computation
    const expectedHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address[]", "uint256[]", "bytes[]", "bytes32", "bytes32"],
        [targets, values, datas, predecessor, salt]
      )
    );
    expect(hash).to.equal(expectedHash);
  });
});