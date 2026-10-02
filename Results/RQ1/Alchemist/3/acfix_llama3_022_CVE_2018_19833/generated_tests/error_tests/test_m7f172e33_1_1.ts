import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m7f172e33 by transferring exact full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 100;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer the owner's entire balance to addr1
    const ownerBalance = await instance.balanceOf(owner.address);
    await expect(instance.transfer(addr1.address, ownerBalance)).to.not.be.reverted;

    // Verify that the transfer actually happened
    expect(await instance.balanceOf(owner.address)).to.equal(0);
    expect(await instance.balanceOf(addr1.address)).to.equal(ownerBalance);
  });
});