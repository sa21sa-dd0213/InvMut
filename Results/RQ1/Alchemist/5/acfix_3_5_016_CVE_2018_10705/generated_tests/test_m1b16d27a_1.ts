import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m1b16d27a test", function () {
  it("should revert when owner calls a onlyOwner function due to mutated modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // So when the actual owner calls any function with onlyOwner modifier, it should revert
    // because owner == msg.sender, so the condition msg.sender != owner is false
    // We use setOwner as it is the only function with onlyOwner modifier
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.be.reverted;
  });
});