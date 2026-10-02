import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant test - missing require on call success", function () {
  it("should revert when external call to non-existent function fails", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a dummy contract that does NOT implement transferFrom
    const DummyFactory = await ethers.getContractFactory("DummyContract");
    const dummy = await DummyFactory.deploy();
    await dummy.waitForDeployment();

    const recipients = [to.address];
    const value = ethers.parseEther("1");

    // The call should revert because the dummy contract does not have transferFrom
    await expect(
      instance.transfer(from.address, dummy.target, recipients, value)
    ).to.be.reverted;
  });
});