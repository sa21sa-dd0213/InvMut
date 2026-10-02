import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m872333e5 - _transfer >= replaced with ==", function () {
  it("should revert when transferring less than full balance due to mutant equality check", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has 1000 tokens initially (initialSupply * 10^0 since decimals = 0)
    const transferAmount = 500; // Less than owner's full balance

    // This should succeed on the original (balanceOf >= transferAmount)
    // But the mutant requires balanceOf == transferAmount, so it should revert
    await expect(
      instance.transfer(recipient.address, transferAmount)
    ).to.be.reverted;
  });
});