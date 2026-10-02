import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should emit Burn event when burn is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    const burnAmount = 100;
    const tx = await instance.connect(owner).burn(burnAmount);
    const receipt = await tx.wait();

    // Check that Burn event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Burn")
      .withArgs(owner.address, burnAmount);
  });
});