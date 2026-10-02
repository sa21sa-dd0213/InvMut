import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls sendTo (kills mutant m3e63990b)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = addr2.address;
    const amount = ethers.parseEther("1.0");

    // Call from unauthorized address (addr1) - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).sendTo(receiver, amount)
    ).to.be.reverted;
  });
});