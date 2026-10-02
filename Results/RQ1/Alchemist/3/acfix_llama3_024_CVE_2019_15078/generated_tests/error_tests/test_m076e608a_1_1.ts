import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m076e608a - onlyOwner modifier", function () {
  it("should revert when owner calls onlyOwner function if mutant changes == to !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call an onlyOwner function (transferOwnership) from the owner
    // In the mutant, require(msg.sender != owner) will revert for the owner
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});