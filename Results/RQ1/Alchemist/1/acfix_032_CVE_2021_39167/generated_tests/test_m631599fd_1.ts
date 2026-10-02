import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - hashOperation return", function () {
  it("should detect mutant that removes return keyword from hashOperation", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      3600, // minDelay
      [owner.address], // proposers
      [owner.address] // executors
    );
    await instance.waitForDeployment();

    // Test parameters
    const target = "0x0000000000000000000000000000000000000001";
    const value = ethers.parseEther("1.0");
    const data = "0x1234";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // Compute expected hash locally
    const expectedHash = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "uint256", "bytes", "bytes32", "bytes32"],
        [target, value, data, predecessor, salt]
      )
    );

    // Call hashOperation
    const result = await instance.hashOperation(target, value, data, predecessor, salt);

    // If mutant is present, result will be ZeroHash (bytes32(0))
    // If original, result will match expectedHash
    expect(result).to.equal(expectedHash);
  });
});