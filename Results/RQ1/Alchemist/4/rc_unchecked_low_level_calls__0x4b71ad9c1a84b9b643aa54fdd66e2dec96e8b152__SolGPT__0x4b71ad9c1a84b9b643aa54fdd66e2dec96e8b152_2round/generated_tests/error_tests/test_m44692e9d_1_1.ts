import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - kill m44692e9d", function () {
  it("should revert when calling transfer with an empty _tos array on original, but mutant should revert with any _tos array due to impossible < 0 check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // Since array length is always >= 0, the mutant will always revert.
    // We call transfer with a valid non-empty _tos array (which should pass on original)
    // and expect revert on the mutant because _tos.length < 0 is never true.
    const tos = [addr1.address];
    await expect(
      instance.transfer(owner.address, addr2.address, tos, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});