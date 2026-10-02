import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls burn, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Original contract: only owner can burn. Mutant: anyone can burn.
    // addr1 should NOT be able to burn, so we expect revert.
    // If the mutant is live (onlyOwner removed), this call will succeed instead of reverting.
    await expect(
      instance.connect(addr1).burn(100)
    ).to.be.reverted;
  });
});