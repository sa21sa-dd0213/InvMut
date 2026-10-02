import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls owned() if onlyOwner modifier is present", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so calling owned() should revert if modifier is present
    await expect(
      instance.connect(addr1).owned()
    ).to.be.revertedWith(""); // exact revert reason depends on require statement
  });
});