import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - m0c4573f7", function () {
  it("should revert when _tos array is empty (kills mutant that removed require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // The mutant removes the require(_tos.length > 0) check.
    // Original reverts with empty array; mutant would not revert.
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.be.reverted;
  });
});