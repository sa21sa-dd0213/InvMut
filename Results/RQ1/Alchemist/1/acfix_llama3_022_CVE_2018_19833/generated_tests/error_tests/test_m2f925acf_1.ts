import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when burning more tokens than the caller's balance (detect mutant m2f925acf)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has all tokens initially (1000 * 10^0 = 1000)
    // Attempt to burn more tokens than owner has (e.g., 2000)
    await expect(
      instance.burn(2000)
    ).to.be.reverted;
  });
});