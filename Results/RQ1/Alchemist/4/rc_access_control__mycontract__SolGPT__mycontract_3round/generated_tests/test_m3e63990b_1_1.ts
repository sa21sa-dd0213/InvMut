import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls sendTo (kills mutant that removes owner check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = addr1.address;
    const amount = ethers.parseEther("0.1");

    // Non-owner (addr1) attempts to call sendTo - should revert in original
    await expect(
      instance.connect(addr1).sendTo(receiver, amount)
    ).to.be.reverted;
  });
});