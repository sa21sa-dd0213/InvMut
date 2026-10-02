import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m140b2648 test", function () {
  it("should revert when _tos array is empty (original behavior), mutant should not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with empty _tos array - original contract should revert, mutant should not
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [],
        []
      )
    ).to.be.reverted;
  });
});