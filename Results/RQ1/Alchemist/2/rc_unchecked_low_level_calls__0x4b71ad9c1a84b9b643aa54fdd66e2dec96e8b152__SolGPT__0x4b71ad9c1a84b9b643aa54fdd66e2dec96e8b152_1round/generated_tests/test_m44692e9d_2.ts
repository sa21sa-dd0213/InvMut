import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert on the mutant when calling transfer with a non-empty _tos array (mutant changes require(_tos.length > 0) to require(_tos.length < 0), making it always revert)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call transfer with a non-empty _tos array
    // On original: require(_tos.length > 0) passes, function proceeds
    // On mutant: require(_tos.length < 0) fails (length is 1, not < 0), function reverts
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [addr2.address], // non-empty array with one address
        100
      )
    ).to.be.reverted;
  });
});