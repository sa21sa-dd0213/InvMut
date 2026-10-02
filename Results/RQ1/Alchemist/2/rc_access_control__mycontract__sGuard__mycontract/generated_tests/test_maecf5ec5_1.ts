import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection", function () {
  it("should revert when owner calls sendTo (mutant changes == to !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract allows owner to call sendTo successfully.
    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner),
    // which will cause the owner's call to revert.
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});