import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m53c23e7e test", function () {
  it("should revert when empty _tos array is passed (original) but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // In the original contract, require(_tos.length > 0) reverts with empty array
    // The mutant changes to require(_tos.length >= 0) which always passes
    // Therefore, the call should NOT revert on the mutant
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.not.be.reverted;
  });
});