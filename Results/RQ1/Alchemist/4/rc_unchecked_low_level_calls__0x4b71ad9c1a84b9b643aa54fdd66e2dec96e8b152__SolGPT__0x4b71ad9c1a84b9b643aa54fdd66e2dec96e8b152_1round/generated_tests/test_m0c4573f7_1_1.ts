import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original behavior) - kills mutant m0c4573f7", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the require(_tos.length > 0) check
    // Original reverts on empty array, mutant does not
    await expect(
      instance.transfer(owner.address, addr1.address, [], ethers.parseEther("1"))
    ).to.be.reverted;
  });
});