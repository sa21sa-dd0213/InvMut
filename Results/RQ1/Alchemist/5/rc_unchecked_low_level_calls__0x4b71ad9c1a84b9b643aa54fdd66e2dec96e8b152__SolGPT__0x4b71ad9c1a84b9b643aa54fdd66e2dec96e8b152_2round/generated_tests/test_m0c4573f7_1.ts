import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m0c4573f7 test", function () {
  it("should revert when _tos array is empty (original) but succeed on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // This call should revert on original (require(_tos.length > 0) is removed in mutant)
    // For the mutant, it will not revert and return true, so we expect a failure
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.be.reverted;
  });
});