import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant test - m0c4573f7", function () {
  it("should revert when _tos array is empty (original behavior) - mutant will not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the require(_tos.length > 0) check
    // Passing an empty _tos array should revert in original but succeed in mutant
    // We expect a revert to detect the mutant (mutant will not revert)
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [],
        100
      )
    ).to.be.reverted;
  });
});