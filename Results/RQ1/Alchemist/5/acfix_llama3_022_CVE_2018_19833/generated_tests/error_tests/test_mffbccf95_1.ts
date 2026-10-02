import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transferring tokens to zero address (kill mutant that removes zero address check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("1000", 0);
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 first so addr1 can attempt transfer
    await instance.connect(owner).transfer(addr1.address, ethers.parseUnits("100", 0));

    // Attempt to transfer from addr1 to zero address - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).transfer(ethers.ZeroAddress, ethers.parseUnits("10", 0))
    ).to.be.reverted;
  });
});