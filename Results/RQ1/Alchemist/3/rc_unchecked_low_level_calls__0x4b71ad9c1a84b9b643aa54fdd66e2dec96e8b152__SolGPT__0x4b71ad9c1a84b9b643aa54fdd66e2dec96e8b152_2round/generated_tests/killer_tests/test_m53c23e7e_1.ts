import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m53c23e7e test", function () {
  it("should revert when _tos array is empty (original behavior)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract does not have a constructor, so no arguments needed
    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("0.1");

    // In the original contract, require(_tos.length > 0) would revert on empty array
    // In the mutant, require(_tos.length >= 0) always passes, so the call would succeed
    // This test expects a revert to kill the mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.be.reverted;
  });
});