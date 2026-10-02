import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transferring to zero address (kills mutant that removes zero-address check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("1000");
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 first so they have a balance to transfer from
    await instance.transfer(addr1.address, ethers.parseEther("100"));

    // Attempt to transfer from addr1 to zero address - should revert
    await expect(
      instance.connect(addr1).transfer(ethers.ZeroAddress, ethers.parseEther("10"))
    ).to.be.reverted;
  });
});