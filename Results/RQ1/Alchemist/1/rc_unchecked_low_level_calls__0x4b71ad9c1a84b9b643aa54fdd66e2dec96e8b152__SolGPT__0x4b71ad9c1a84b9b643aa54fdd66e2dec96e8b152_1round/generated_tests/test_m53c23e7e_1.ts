import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m53c23e7e test", function () {
  it("should revert when _tos array is empty in original but pass in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with empty _tos array - original requires length > 0, mutant requires length >= 0
    // The mutant would not revert, so we expect revert to kill the mutant
    await expect(
      instance.transfer(owner.address, addr1.address, [], ethers.parseEther("1"))
    ).to.be.reverted;
  });
});