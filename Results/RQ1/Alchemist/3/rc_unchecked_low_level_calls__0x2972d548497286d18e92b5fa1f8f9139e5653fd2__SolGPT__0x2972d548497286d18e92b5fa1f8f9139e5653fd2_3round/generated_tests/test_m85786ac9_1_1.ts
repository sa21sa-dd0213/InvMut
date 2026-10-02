import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m85786ac9 test", function () {
  it("should revert when _tos array is empty due to require check in original contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the require(_tos.length > 0) check
    // Calling with empty _tos array should revert in original but succeed in mutant
    // Test expects revert to kill the mutant (mutant would not revert)
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