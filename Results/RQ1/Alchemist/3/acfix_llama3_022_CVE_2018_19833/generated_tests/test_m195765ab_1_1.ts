import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m195765ab by calling burn with value less than balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has totalSupply = 1000 * 10^0 = 1000 tokens
    // Burn only 500 tokens (less than full balance)
    const burnAmount = 500;

    // On original: succeeds because 1000 >= 500
    // On mutant: reverts because 1000 != 500
    await expect(instance.connect(owner).burn(burnAmount)).to.not.be.reverted;
  });
});