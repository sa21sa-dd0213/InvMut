import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls updateAlloSettings", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Attempt to call updateAlloSettings from a non-owner address
    await expect(
      instance.connect(addr1).updateAlloSettings(addr2.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});