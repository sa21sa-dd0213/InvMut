import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original) but mutant passes", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty _tos array
    const emptyAddresses: string[] = [];

    // This should revert on the original (require(_tos.length > 0))
    // but the mutant (require(_tos.length >= 0)) will not revert
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        emptyAddresses,
        100,
        18
      )
    ).to.be.reverted;
  });
});