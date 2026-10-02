import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls burn (mutant removes onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 so they have a balance to burn
    const transferAmount = 100;
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Attempt to call burn from non-owner address (should revert in original)
    await expect(
      instance.connect(addr1).burn(50)
    ).to.be.reverted;
  });
});