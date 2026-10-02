import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - mfc3dae0c", function () {
  it("should revert when calling transfer with _tos.length < 0 (impossible condition)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // Since array length is always >= 0, the mutated require will always revert
    // Test with a valid array of recipients - original should pass, mutant should revert
    const recipients = [addr1.address];
    const value = ethers.parseEther("1");

    // This should revert in the mutant because _tos.length (1) is not < 0
    await expect(
      instance.transfer(owner.address, addr2.address, recipients, value)
    ).to.be.reverted;
  });
});