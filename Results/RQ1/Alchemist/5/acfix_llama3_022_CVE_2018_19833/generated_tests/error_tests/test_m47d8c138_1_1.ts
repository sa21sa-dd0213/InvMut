import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - Burn event emission", function () {
  it("should emit Burn event when burn is called by owner", async function () {
    const [owner] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    const burnAmount = 100;

    // Expect the Burn event to be emitted with correct parameters
    await expect(instance.burn(burnAmount))
      .to.emit(instance, "Burn")
      .withArgs(owner.address, burnAmount);
  });
});