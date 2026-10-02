import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant that removed require(_tos.length > 0))", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract has no constructor arguments, so we can deploy without any.

    // Test case: call transfer with empty _tos and v arrays
    // The original contract requires _tos.length > 0, so it reverts.
    // The mutant removes this require, so it would not revert - this test kills it.
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,   // caddress - arbitrary address for the call
        [],              // _tos - empty array
        []               // v - empty array
      )
    ).to.be.reverted;
  });
});