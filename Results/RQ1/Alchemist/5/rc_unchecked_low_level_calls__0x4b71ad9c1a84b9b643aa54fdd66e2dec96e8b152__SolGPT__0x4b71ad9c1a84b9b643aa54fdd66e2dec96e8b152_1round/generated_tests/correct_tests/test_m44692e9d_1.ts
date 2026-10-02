import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m44692e9d by calling transfer with non-empty _tos array and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // A valid non-empty array should pass on original but fail on mutant
    const tos = [addr2.address];
    const value = ethers.parseEther("1.0");

    // This call should succeed on original but revert on mutant
    await expect(
      instance.connect(owner).transfer(owner.address, addr1.address, tos, value)
    ).to.not.be.reverted;
  });
});