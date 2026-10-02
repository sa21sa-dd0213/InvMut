import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract - mutant m2c935e1a test", function () {
  it("should allow non-owner to call sendTo (mutant inverts access control)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant requires msg.sender != owner, so a non-owner call should succeed
    await expect(
      instance.connect(addr1).sendTo(addr2.address, ethers.parseEther("1"))
    ).to.not.be.reverted;
  });
});