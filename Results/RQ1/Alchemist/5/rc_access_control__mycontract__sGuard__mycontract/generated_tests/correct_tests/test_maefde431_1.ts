import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls sendTo (mutant kills require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sendTo from an unauthorized address (addr1)
    // The original contract reverts, the mutant would allow it
    await expect(
      instance.connect(addr1).sendTo(addr2.address, ethers.parseEther("0.1"))
    ).to.be.reverted;
  });
});