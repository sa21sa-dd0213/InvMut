import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test case: call transfer with an empty _tos array - should revert due to require(_tos.length > 0)
    const emptyAddresses: string[] = [];
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, 100)
    ).to.be.reverted;
  });
});