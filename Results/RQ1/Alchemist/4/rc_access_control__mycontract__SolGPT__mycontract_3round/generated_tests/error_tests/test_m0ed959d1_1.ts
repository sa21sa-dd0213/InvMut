import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to send to non-zero address (mutant changes != to == for address(0) check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // This call should succeed on original but revert on mutant
    // because mutant requires receiver == address(0) instead of != address(0)
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("1"))
    ).to.not.be.reverted;
  });
});