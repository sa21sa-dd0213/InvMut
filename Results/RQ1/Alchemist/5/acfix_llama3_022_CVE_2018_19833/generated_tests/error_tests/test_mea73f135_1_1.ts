import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls owned() in original, but mutant would not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // The owned() function in the original contract requires msg.sender == owner
    // The mutant removes this require statement, so calling from non-owner would not revert
    // This test expects a revert when called from a non-owner address
    await expect(
      instance.connect(addr1).owned()
    ).to.be.revertedWith("Only the current owner can change ownership");
  });
});