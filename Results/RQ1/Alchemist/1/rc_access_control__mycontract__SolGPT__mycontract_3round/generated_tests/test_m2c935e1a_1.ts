import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when owner calls sendTo due to mutant inverted require check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the mutant, require(msg.sender != owner) means the owner's call should revert
    // Original contract would succeed when owner calls, but mutant reverts
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});