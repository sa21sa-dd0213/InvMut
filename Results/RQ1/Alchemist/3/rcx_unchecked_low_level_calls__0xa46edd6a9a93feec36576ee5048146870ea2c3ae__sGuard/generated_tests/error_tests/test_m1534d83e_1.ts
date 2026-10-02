import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m1534d83e", function () {
  it("should detect mutant where require(_tos.length > 0) changed to require(_tos.length < 0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test case: Call transfer with a valid non-empty array (length > 0)
    // This should succeed on the original contract but revert on the mutant
    // because _tos.length < 0 is always false for unsigned integers
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")];

    // Expect revert due to the mutant's impossible require condition
    await expect(
      instance.transfer(owner.address, owner.address, tos, values)
    ).to.be.reverted;
  });
});