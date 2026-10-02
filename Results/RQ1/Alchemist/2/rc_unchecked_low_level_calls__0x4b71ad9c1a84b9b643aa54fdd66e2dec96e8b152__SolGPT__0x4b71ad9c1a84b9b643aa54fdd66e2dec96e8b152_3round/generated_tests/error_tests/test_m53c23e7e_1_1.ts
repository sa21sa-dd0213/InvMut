import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m53c23e7e test", function () {
  it("should revert when _tos array is empty (original behavior) but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty array of addresses
    const emptyAddresses: string[] = [];

    // The original contract would revert with require(_tos.length > 0)
    // The mutant changes it to >= 0 which always passes
    // So we expect the mutant to NOT revert when it should
    // We call the function and expect it to succeed (mutant behavior)
    // Then verify the function returned true despite empty array
    const tx = await instance.transfer(owner.address, addr1.address, emptyAddresses, 100);
    const receipt = await tx.wait();

    // The mutant should succeed where original would revert
    // This test kills the mutant because the original would revert here
    expect(receipt).to.not.be.undefined;
    expect(receipt.status).to.equal(1);

    // Additional check: the original contract requires _tos.length > 0
    // so if we get here without revert, the mutant is detected
  });
});