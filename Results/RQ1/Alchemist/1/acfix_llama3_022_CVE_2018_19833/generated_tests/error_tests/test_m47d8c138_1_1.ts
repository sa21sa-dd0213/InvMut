import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should emit Burn event when owner burns tokens - kills mutant that removes event emission", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    const burnAmount = 100;

    // Assert that the Burn event is emitted when burn is called
    await expect(instance.burn(burnAmount))
      .to.emit(instance, "Burn")
      .withArgs(owner.address, burnAmount);
  });
});