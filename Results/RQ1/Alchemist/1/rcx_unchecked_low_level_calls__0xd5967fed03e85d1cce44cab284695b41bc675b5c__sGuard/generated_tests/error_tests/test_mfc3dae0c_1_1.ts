import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mfc3dae0c: require(_tos.length > 0) changed to require(_tos.length < 0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // Since array length can never be negative, any call with a non-empty _tos array
    // will revert in the mutant, but succeed in the original.
    // Test with a single recipient address in the _tos array.
    const recipients = [addr1.address];
    const value = ethers.parseEther("1");

    // This call should revert on the mutant because _tos.length (1) is not < 0
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, value)
    ).to.be.reverted;
  });
});