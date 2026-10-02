import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m140b2648 test", function () {
  it("should revert when called with empty _tos array (original behavior) but mutant will not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a dummy token address (any EOA will work for this test)
    const dummyToken = addr1.address;

    // Call transfer with empty arrays - should revert in original due to require check
    await expect(
      instance.transfer(
        owner.address,
        dummyToken,
        [],
        []
      )
    ).to.be.reverted;
  });
});