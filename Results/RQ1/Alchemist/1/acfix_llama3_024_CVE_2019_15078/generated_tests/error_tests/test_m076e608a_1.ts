import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m076e608a - onlyOwner modifier", function () {
  it("should revert when owner calls onlyOwner function due to mutated modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // So when owner calls an onlyOwner function, it should revert
    // Using finishDistribution() as an example onlyOwner function
    await expect(
      instance.connect(owner).finishDistribution()
    ).to.be.reverted;
  });
});