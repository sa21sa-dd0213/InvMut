import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant m3e63990b test", function () {
  it("should revert when non-owner calls sendTo due to missing authorization check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = addr2.address;
    const amount = ethers.parseEther("0.1");

    // Non-owner (addr1) tries to call sendTo - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).sendTo(receiver, amount)
    ).to.be.reverted;
  });
});