import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test", function () {
  it("should revert when non-owner calls mintToken (mutant removed onlyOwner modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TT");
    await instance.waitForDeployment();

    // Attempt to call mintToken from a non-owner address - should revert on original, succeed on mutant
    await expect(
      instance.connect(addr1).mintToken(addr2.address, 500)
    ).to.be.reverted;
  });
});