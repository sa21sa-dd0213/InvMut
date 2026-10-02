import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty on original, but pass on mutant (kills mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty _tos array
    const emptyTos: string[] = [];

    // Call transfer with empty array - should revert on original (require fails)
    // On mutant (without require), this call would succeed and return true
    await expect(
      instance.transfer(owner.address, addr1.address, emptyTos, 100)
    ).to.be.reverted;
  });
});