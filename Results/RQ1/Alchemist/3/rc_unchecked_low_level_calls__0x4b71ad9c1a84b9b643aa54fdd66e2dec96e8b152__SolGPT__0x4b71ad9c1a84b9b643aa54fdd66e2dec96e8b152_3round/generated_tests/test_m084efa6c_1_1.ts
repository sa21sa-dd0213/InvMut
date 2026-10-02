import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m084efa6c by expecting revert when external call fails", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a non-contract address that will cause the low-level call to fail
    const nonContractAddress = addr2.address;
    const tos = [addr1.address];
    const value = ethers.parseEther("1");

    // The original requires(_s) will revert when call fails;
    // the mutant removes require, so it will not revert
    await expect(
      instance.transfer(owner.address, nonContractAddress, tos, value)
    ).to.be.reverted;
  });
});