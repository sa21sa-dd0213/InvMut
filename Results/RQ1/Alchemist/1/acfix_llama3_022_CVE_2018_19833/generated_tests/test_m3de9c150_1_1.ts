import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m3de9c150 by burning less than balance and expecting success on original but revert on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has initialSupply tokens (1000 * 10^0 = 1000)
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(1000);

    // Burn 10 tokens when owner has 1000 tokens (1000 >= 10 is true, but 1000 <= 10 is false)
    // On original: should succeed
    // On mutant: should revert because 1000 <= 10 is false
    const burnAmount = 10;
    const tx = instance.connect(owner).burn(burnAmount);

    // The test expects revert because the mutant's condition fails
    await expect(tx).to.be.reverted;
  });
});