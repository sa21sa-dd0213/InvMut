import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls sendTo (kill mutant that removes owner check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sendTo from a non-owner address
    await expect(
      instance.connect(addr1).sendTo(addr1.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});