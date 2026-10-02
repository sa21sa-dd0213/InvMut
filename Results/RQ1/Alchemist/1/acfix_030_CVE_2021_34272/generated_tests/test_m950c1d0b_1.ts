import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant test - m950c1d0b", function () {
  it("should revert when owner calls a protected function (mutant inverts modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    // Owned contract has no constructor arguments
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // So calling from owner should now revert (instead of succeed)
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});